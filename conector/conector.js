/**
 * conector.js — TraceOne × GDIS (contratadaweb)
 *
 * Consulta o serial do medidor instalado em cada número de serviço, lendo a
 * página de detalhe do serviço no GDIS. Roda na máquina do usuário porque o
 * GDIS só é acessível pela rede interna.
 *
 * Executar:  node conector.js
 * Requer:    npm install
 *            npx playwright install msedge
 */

const express = require('express');
const cors = require('cors');
const { chromium } = require('playwright');

const app = express();
const PORT = 3334; // 3333 é do conector do Visão de Dono — portas separadas

const CONFIG = {
  baseUrl: 'http://192.168.122.110',
  loginUrl: 'http://192.168.122.110/contratadaweb/login.jsp',
  menuUrl: 'http://192.168.122.110/contratadaweb/menu.jsp',
  detalheUrl: (numServ) =>
    `http://192.168.122.110/contratadaweb/consultas/historico/servico_detalhe.jsp?NumServ=${encodeURIComponent(numServ)}`,
  pausaEntreConsultasMs: 1200,
};

app.use(cors());
app.use(express.json({ limit: '5mb' }));

let browser = null;
let page = null;
let sessaoOk = false;
let jobAtivo = false;

// ── SSE ───────────────────────────────────────────────────────────────────────
let sseClients = [];

function broadcast(evento) {
  const data = `data: ${JSON.stringify(evento)}\n\n`;
  sseClients.forEach((res) => res.write(data));
}

function debug(msg) {
  broadcast({ tipo: 'debug', msg });
  console.log(`[DEBUG] ${msg}`);
}

app.get('/status-stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  sseClients.push(res);
  req.on('close', () => {
    sseClients = sseClients.filter((c) => c !== res);
  });
});

app.get('/ping', (req, res) => {
  res.json({ ok: true, sessaoOk, jobAtivo });
});

// ── 1. Abrir navegador e ir para o login ──────────────────────────────────────
app.post('/iniciar-sessao', async (req, res) => {
  const { cnpj, inscEstadual } = req.body || {};
  try {
    if (browser) await browser.close().catch(() => {});

    browser = await chromium.launch({
      channel: 'msedge',
      headless: false,
      args: ['--start-maximized', '--disable-popup-blocking'],
    });

    const context = await browser.newContext();

    // O GDIS é um sistema legado que assume comportamento do IE:
    // document.getElementById() encontrando elementos pelo atributo name.
    await context.addInitScript(() => {
      const original = document.getElementById;
      document.getElementById = function (id) {
        let el = original.call(document, id);
        if (!el) {
          const porNome = document.getElementsByName(id);
          if (porNome && porNome.length > 0) el = porNome[0];
        }
        return el;
      };
    });

    page = await context.newPage();
    await page.goto(CONFIG.loginUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    if (cnpj) {
      await preencherSeExistir(page, '[name="cnpj"], #cnpj, input[placeholder*="CNPJ"]', cnpj);
    }
    if (inscEstadual) {
      await preencherSeExistir(
        page,
        '[name="inscEstadual"], #inscEstadual, input[placeholder*="nscri"]',
        inscEstadual
      );
    }

    sessaoOk = false;
    broadcast({
      tipo: 'aguardando_captcha',
      msg: 'Navegador aberto. Preencha a senha, resolva o reCAPTCHA e entre no GDIS. Depois clique em Continuar aqui.',
    });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

// ── 2. Confirmar que o login passou ───────────────────────────────────────────
app.post('/continuar-apos-captcha', async (req, res) => {
  try {
    if (!page) return res.status(400).json({ ok: false, erro: 'Sessão não iniciada.' });

    await page.goto(CONFIG.menuUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

    if (/login/i.test(page.url())) {
      return res.status(400).json({
        ok: false,
        erro: 'Ainda na tela de login. Confirme que entrou no GDIS e tente de novo.',
      });
    }

    sessaoOk = true;
    broadcast({ tipo: 'sessao_ok', msg: 'Sessão confirmada. Pronto para consultar.' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, erro: err.message });
  }
});

// ── 3. Consultar seriais em lote ──────────────────────────────────────────────
app.post('/buscar-seriais', (req, res) => {
  if (!sessaoOk) return res.status(400).json({ ok: false, erro: 'Sessão não iniciada.' });
  if (jobAtivo) return res.status(400).json({ ok: false, erro: 'Já existe uma consulta em andamento.' });

  const { itens } = req.body || {};
  if (!Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ ok: false, erro: 'Nenhum item enviado.' });
  }

  jobAtivo = true;
  res.json({ ok: true, total: itens.length });
  executarLote(itens);
});

app.post('/cancelar', (req, res) => {
  jobAtivo = false;
  broadcast({ tipo: 'cancelado', msg: 'Consulta cancelada.' });
  res.json({ ok: true });
});

// ── Lógica do lote ────────────────────────────────────────────────────────────
async function executarLote(itens) {
  broadcast({ tipo: 'inicio_lote', total: itens.length });

  for (let i = 0; i < itens.length; i++) {
    if (!jobAtivo) break;

    const item = itens[i];
    broadcast({
      tipo: 'iniciando',
      index: i,
      medidorId: item.medidorId,
      servicoGdis: item.servicoGdis,
    });

    try {
      const resultado = await consultarServico(item.servicoGdis);

      if (resultado.serial) {
        broadcast({
          tipo: 'encontrado',
          index: i,
          medidorId: item.medidorId,
          servicoGdis: item.servicoGdis,
          serial: resultado.serial,
          matExecutor: resultado.matExecutor,
        });
      } else {
        broadcast({
          tipo: 'vazio',
          index: i,
          medidorId: item.medidorId,
          servicoGdis: item.servicoGdis,
          msg: 'Campo "Med. Instalado / Encontrado" está vazio nesse serviço.',
        });
      }
    } catch (err) {
      broadcast({
        tipo: 'erro',
        index: i,
        medidorId: item.medidorId,
        servicoGdis: item.servicoGdis,
        msg: err.message,
      });

      // Sessão caiu: não adianta seguir martelando o resto do lote.
      if (/sess(ã|a)o/i.test(err.message)) {
        sessaoOk = false;
        broadcast({ tipo: 'sessao_perdida', msg: 'Sessão do GDIS expirou. Inicie a sessão de novo.' });
        break;
      }
    }

    await sleep(CONFIG.pausaEntreConsultasMs);
  }

  jobAtivo = false;
  broadcast({ tipo: 'fim_lote', msg: 'Lote finalizado.' });
}

async function consultarServico(numServ) {
  debug(`Consultando serviço ${numServ}…`);
  await page.goto(CONFIG.detalheUrl(numServ), { waitUntil: 'domcontentloaded', timeout: 25000 });

  if (/login/i.test(page.url())) {
    throw new Error('Sessão expirada — o GDIS redirecionou para o login.');
  }

  const dados = await page.evaluate(() => {
    const limpar = (s) => (s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

    // A página monta os dados como <Th>Rótulo:</Th><Td>valor</Td>.
    const valorDoRotulo = (inicioDoRotulo) => {
      const ths = Array.from(document.querySelectorAll('th'));
      const alvo = ths.find((th) =>
        limpar(th.textContent).toLowerCase().startsWith(inicioDoRotulo.toLowerCase())
      );
      if (!alvo) return null;
      const td = alvo.nextElementSibling;
      if (!td || td.tagName.toLowerCase() !== 'td') return null;
      return limpar(td.textContent);
    };

    return {
      serial: valorDoRotulo('med. instalado'),
      matExecutor: valorDoRotulo('mat. executor'),
      numServPagina: valorDoRotulo('nº serviço') || valorDoRotulo('n° serviço'),
      achouTabela: document.querySelectorAll('th').length > 0,
    };
  });

  if (!dados.achouTabela) {
    throw new Error('Página carregou sem a tabela de detalhes — serviço pode não existir.');
  }

  // Confere que a página é mesmo do serviço pedido, pra não gravar serial trocado.
  if (dados.numServPagina && String(dados.numServPagina) !== String(numServ)) {
    throw new Error(
      `A página retornou o serviço ${dados.numServPagina}, mas foi pedido ${numServ}. Ignorado por segurança.`
    );
  }

  if (dados.serial) {
    debug(`Serviço ${numServ}: serial ${dados.serial}${dados.matExecutor ? ` (executor ${dados.matExecutor})` : ''}`);
  } else {
    debug(`Serviço ${numServ}: sem serial preenchido.`);
  }

  return dados;
}

// ── Utilitários ───────────────────────────────────────────────────────────────
async function preencherSeExistir(pg, seletor, valor) {
  try {
    const el = await pg.$(seletor);
    if (el) {
      await el.fill('');
      await el.type(String(valor), { delay: 30 });
    }
  } catch (_) {}
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   Conector TraceOne × GDIS                   ║');
  console.log(`║   Rodando em http://localhost:${PORT}           ║`);
  console.log('║                                              ║');
  console.log('║   Deixe esta janela aberta enquanto usa.     ║');
  console.log('║   Para parar: Ctrl + C                       ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
});
