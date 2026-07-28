-- =============================================================================
-- TraceOne — 003_rpc_functions.sql
-- Colar no SQL Editor do Supabase APÓS executar 001 e 002
-- Contém: create_movement e get_dashboard_stats
-- =============================================================================

-- =============================================================================
-- RPC: create_movement
-- Replica MovementsService.create com validações estritas + transação atômica
-- Chamada no frontend: supabase.rpc('create_movement', { p_type, p_item_id, ... })
-- =============================================================================
CREATE OR REPLACE FUNCTION create_movement(
  p_type        movement_type,
  p_item_id     UUID,
  p_employee_id UUID DEFAULT NULL,
  p_quantity    INTEGER DEFAULT 1,
  p_notes       TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id      UUID;
  v_user_role    role_type;
  v_item         items%ROWTYPE;
  v_employee     employees%ROWTYPE;
  v_movement_id  UUID;
  v_movement_row stock_movements%ROWTYPE;
  v_new_quantity INTEGER;
  v_audit_action audit_action;
BEGIN
  -- Verificar autenticação
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  -- Verificar role: somente ADMIN e ALMOXARIFE podem criar movimentações
  SELECT role INTO v_user_role FROM profiles WHERE id = v_user_id;
  IF v_user_role NOT IN ('ADMIN', 'ALMOXARIFE') THEN
    RAISE EXCEPTION 'Acesso negado: somente ADMIN e ALMOXARIFE podem registrar movimentações' USING ERRCODE = '42501';
  END IF;

  -- Buscar item
  SELECT * INTO v_item FROM items WHERE id = p_item_id AND is_active = TRUE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item não encontrado ou inativo';
  END IF;

  -- Validar quantity
  IF p_quantity < 1 THEN
    RAISE EXCEPTION 'Quantidade deve ser maior que zero';
  END IF;

  -- Validar employeeId obrigatório para certos tipos
  IF p_type IN ('DELIVERY', 'RETURN', 'REPLACEMENT') AND p_employee_id IS NULL THEN
    RAISE EXCEPTION 'employeeId é obrigatório para movimentações do tipo %', p_type;
  END IF;

  -- Buscar colaborador (se informado)
  IF p_employee_id IS NOT NULL THEN
    SELECT * INTO v_employee FROM employees WHERE id = p_employee_id AND is_active = TRUE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Colaborador não encontrado ou inativo';
    END IF;
  END IF;

  -- ===== Validações específicas para ASSET =====
  IF v_item.type = 'ASSET' THEN
    IF p_type = 'DELIVERY' THEN
      IF v_item.current_holder_id IS NOT NULL THEN
        RAISE EXCEPTION 'Este ativo já está alocado para um colaborador. Registre uma devolução primeiro.';
      END IF;
    END IF;

    IF p_type = 'RETURN' THEN
      IF v_item.current_holder_id IS NULL THEN
        RAISE EXCEPTION 'Este ativo não está alocado para nenhum colaborador.';
      END IF;
      IF v_item.current_holder_id <> p_employee_id THEN
        RAISE EXCEPTION 'Este ativo está alocado para outro colaborador. Verifique o colaborador informado.';
      END IF;
    END IF;
  END IF;

  -- ===== Validações específicas para CONSUMABLE =====
  IF v_item.type = 'CONSUMABLE' THEN
    IF p_type IN ('DELIVERY', 'LOSS', 'WRITEOFF', 'REPLACEMENT') THEN
      v_new_quantity := v_item.quantity - p_quantity;
      IF v_new_quantity < 0 THEN
        RAISE EXCEPTION 'Estoque insuficiente. Disponível: %, Solicitado: %', v_item.quantity, p_quantity;
      END IF;
    END IF;
    IF p_type = 'RETURN' THEN
      v_new_quantity := v_item.quantity + p_quantity;
    END IF;
  END IF;

  -- ===== Inserir movimentação com snapshot =====
  INSERT INTO stock_movements (
    type, item_id, employee_id, user_id, quantity, notes,
    item_name, employee_name, employee_registration
  )
  VALUES (
    p_type,
    p_item_id,
    p_employee_id,
    v_user_id,
    p_quantity,
    p_notes,
    v_item.name,
    CASE WHEN v_employee.id IS NOT NULL THEN v_employee.name ELSE NULL END,
    CASE WHEN v_employee.id IS NOT NULL THEN v_employee.registration ELSE NULL END
  )
  RETURNING id INTO v_movement_id;

  -- ===== Atualizar quantidade (CONSUMABLE) =====
  IF v_item.type = 'CONSUMABLE' THEN
    UPDATE items SET quantity = v_new_quantity WHERE id = p_item_id;
  END IF;

  -- ===== Atualizar detentor (ASSET) =====
  IF v_item.type = 'ASSET' THEN
    IF p_type = 'DELIVERY' THEN
      UPDATE items SET current_holder_id = p_employee_id WHERE id = p_item_id;
    ELSIF p_type IN ('RETURN', 'LOSS', 'WRITEOFF') THEN
      UPDATE items SET current_holder_id = NULL WHERE id = p_item_id;
    END IF;
  END IF;

  -- ===== Mapear audit_action =====
  v_audit_action := CASE p_type
    WHEN 'DELIVERY'    THEN 'DELIVERY'::audit_action
    WHEN 'RETURN'      THEN 'RETURN'::audit_action
    WHEN 'LOSS'        THEN 'LOSS'::audit_action
    WHEN 'WRITEOFF'    THEN 'WRITEOFF'::audit_action
    WHEN 'REPLACEMENT' THEN 'DELIVERY'::audit_action
    ELSE 'CREATE'::audit_action
  END;

  -- ===== Inserir auditoria =====
  INSERT INTO audits (user_id, action, entity, entity_id, details)
  VALUES (
    v_user_id,
    v_audit_action,
    'stock_movement',
    v_movement_id,
    jsonb_build_object(
      'movementType', p_type::TEXT,
      'itemId',       p_item_id,
      'itemName',     v_item.name,
      'quantity',     p_quantity,
      'employeeId',   p_employee_id,
      'employeeName', CASE WHEN v_employee.id IS NOT NULL THEN v_employee.name ELSE NULL END
    )
  );

  -- Retornar a movimentação inserida
  SELECT * INTO v_movement_row FROM stock_movements WHERE id = v_movement_id;
  RETURN row_to_json(v_movement_row)::JSONB;
END;
$$;

-- =============================================================================
-- RPC: get_dashboard_stats
-- Replica DashboardService.getStats()
-- Chamada no frontend: supabase.rpc('get_dashboard_stats')
-- =============================================================================
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_user_id           UUID;
  v_month_start       TIMESTAMPTZ;
  v_total_employees   INT;
  v_active_employees  INT;
  v_total_items       INT;
  v_deliveries_month  INT;
  v_returns_month     INT;
  v_losses_month      INT;
  v_low_stock_count   INT;
  v_expiring_count    INT;
  v_allocated_assets  INT;
  v_recent_movements  JSONB;
BEGIN
  -- Verificar autenticação
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;

  v_month_start := date_trunc('month', NOW());

  -- Colaboradores
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE is_active = TRUE AND status = 'ACTIVE')
  INTO v_total_employees, v_active_employees
  FROM employees;

  -- Total itens ativos
  SELECT COUNT(*) INTO v_total_items FROM items WHERE is_active = TRUE;

  -- Movimentações do mês por tipo
  SELECT
    COUNT(*) FILTER (WHERE type = 'DELIVERY'),
    COUNT(*) FILTER (WHERE type = 'RETURN'),
    COUNT(*) FILTER (WHERE type = 'LOSS')
  INTO v_deliveries_month, v_returns_month, v_losses_month
  FROM stock_movements
  WHERE created_at >= v_month_start;

  -- Estoque crítico: consumíveis onde quantity <= min_stock
  SELECT COUNT(*) INTO v_low_stock_count
  FROM items
  WHERE is_active = TRUE
    AND type = 'CONSUMABLE'
    AND quantity <= min_stock;

  -- Itens vencendo nos próximos 30 dias
  SELECT COUNT(*) INTO v_expiring_count
  FROM items
  WHERE is_active = TRUE
    AND type = 'CONSUMABLE'
    AND expires_at IS NOT NULL
    AND expires_at BETWEEN NOW() AND NOW() + INTERVAL '30 days';

  -- Ativos patrimoniados alocados (com detentor)
  SELECT COUNT(*) INTO v_allocated_assets
  FROM items
  WHERE is_active = TRUE
    AND type = 'ASSET'
    AND current_holder_id IS NOT NULL;

  -- 10 movimentações mais recentes com nome do usuário
  SELECT jsonb_agg(row_to_json(m))
  INTO v_recent_movements
  FROM (
    SELECT
      sm.id,
      sm.type,
      sm.item_name,
      sm.employee_name,
      sm.employee_registration,
      sm.quantity,
      sm.notes,
      sm.created_at,
      p.name AS user_name,
      p.role AS user_role
    FROM stock_movements sm
    LEFT JOIN profiles p ON p.id = sm.user_id
    ORDER BY sm.created_at DESC
    LIMIT 10
  ) m;

  RETURN jsonb_build_object(
    'totalEmployees',  v_total_employees,
    'activeEmployees', v_active_employees,
    'totalItems',      v_total_items,
    'deliveriesMonth', v_deliveries_month,
    'returnsMonth',    v_returns_month,
    'lossesMonth',     v_losses_month,
    'lowStockCount',   v_low_stock_count,
    'expiringCount',   v_expiring_count,
    'allocatedAssets', v_allocated_assets,
    'recentMovements', COALESCE(v_recent_movements, '[]'::JSONB)
  );
END;
$$;
