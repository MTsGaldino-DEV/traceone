-- =============================================================================
-- Corrige datas de atribuicao invertidas (dia/mes) nos medidores inseridos
-- a partir do export SAP "medidor juliana 18-09.csv" em 18/09/2026.
--
-- Causa: o leitor de planilha interpretou datas ambiguas (dia <= 12) no
-- padrao americano MM/DD. Ex.: 12/08/2026 (12 de agosto) virou 08/12/2026,
-- e o fuso ainda recuou um dia, resultando em 2026-12-07.
--
-- Linhas afetadas: 1532 (todas status PENDENTE, inseridas em 18/09/2026).
-- Backup do estado anterior: backup/datas_incorretas_2026-09-18.json
-- =============================================================================

BEGIN;

UPDATE medidores_list SET data = DATE '2025-07-03'
 WHERE id IN (
  '50c35fb6-43c5-4638-831a-30625237c9b2'
 );

UPDATE medidores_list SET data = DATE '2025-07-04'
 WHERE id IN (
  'd9ab1fb4-69e7-43fb-997e-4ab3083da11a'
 );

UPDATE medidores_list SET data = DATE '2025-07-07'
 WHERE id IN (
  'c314426d-60e6-4608-9d44-901aae39ea7c'
 );

UPDATE medidores_list SET data = DATE '2025-08-08'
 WHERE id IN (
  '67cd44c3-1295-4aed-bceb-4bfa0cf13064'
 );

UPDATE medidores_list SET data = DATE '2025-09-04'
 WHERE id IN (
  '6149b1f2-e86b-44ff-9fda-264bfbf11340'
 );

UPDATE medidores_list SET data = DATE '2025-09-11'
 WHERE id IN (
  '5cf135aa-e2b3-4502-b3e2-eefcb6c1c468',
  'eea0af3d-daf0-4484-889a-2465989c4752',
  'e5979320-3d34-454b-b4c7-38a5d5aab266'
 );

UPDATE medidores_list SET data = DATE '2025-10-02'
 WHERE id IN (
  'ae469320-122f-4687-8a19-3ba9ddc9a2a4',
  '7c55e31d-5481-47fb-b614-642099741d09',
  '1e2e4112-0046-4ae3-988f-36a26a6f7ab3',
  'f544a931-2c4d-44aa-9927-bbd67fa205a8',
  '1197c48d-ea60-4e08-a2f6-31fe90b29a73',
  '1492f843-8432-4b99-ba1f-c9013939b9e4',
  '2390707b-e96d-403e-8957-e9d159ae4fb9',
  'd4ce780d-4109-40cf-a8cd-faa92cc766dd',
  '9c45a362-8154-44f3-b950-2521ade1bc4c',
  'a3c0a905-a453-4235-92a9-b855a2456ee6',
  '838ffdff-7154-4052-ab5d-c21f1a2d3e63',
  'fb1e7647-2460-4e08-a0bf-b9e65f204714'
 );

UPDATE medidores_list SET data = DATE '2025-10-03'
 WHERE id IN (
  '8ae24eba-f742-497f-afce-226093185f70',
  '976a9e4d-e11d-46ba-a170-4d8d321d7495',
  '958b24ba-1e21-4e65-aa0f-d591455c7bee',
  '74dd602a-e367-40d3-9075-56e4cd2ced10'
 );

UPDATE medidores_list SET data = DATE '2025-10-06'
 WHERE id IN (
  '668d94e7-6fa9-4021-856d-0cdbd50042d2',
  'eea7465d-d59f-46cf-b646-cb929df37041',
  '0476f016-fc01-4106-890b-cf9b548eb460',
  '4e5df160-3bd5-4a47-9aab-6b10f36933d5',
  '3a66abd1-8552-4ef6-a8e5-ac5815fdbcf2'
 );

UPDATE medidores_list SET data = DATE '2025-10-08'
 WHERE id IN (
  'c21e719e-f855-4e43-b2f9-40c136673a8a'
 );

UPDATE medidores_list SET data = DATE '2025-10-10'
 WHERE id IN (
  '6028fbd2-e339-45f5-a21b-4f04d2c764d3',
  'db36a6d7-a71f-4869-8d17-1616f6e20210',
  '31e0adc9-02ec-44ab-909f-95cc6e126862',
  '41839bec-a497-4e9a-879c-a54b5ddb48d0'
 );

UPDATE medidores_list SET data = DATE '2025-11-04'
 WHERE id IN (
  '0b808589-b65b-4d05-9629-46f35fe680fb'
 );

UPDATE medidores_list SET data = DATE '2025-11-05'
 WHERE id IN (
  '33812418-ac55-48cf-bc03-28eb7e2018d4'
 );

UPDATE medidores_list SET data = DATE '2025-12-03'
 WHERE id IN (
  '5d6a0edf-5368-4b74-a8ea-1f8f226b0354',
  '33d8e06f-e964-4618-a442-ecf34ecd5ba6',
  '61c0b95e-48e6-49fd-b673-42b1f83b58e7'
 );

UPDATE medidores_list SET data = DATE '2025-12-04'
 WHERE id IN (
  'cd75de7b-712a-44a8-9c4b-9bb7f7d0b5f4'
 );

UPDATE medidores_list SET data = DATE '2025-12-09'
 WHERE id IN (
  '42d76ba5-a25a-4201-ade3-66f43a535dc4'
 );

UPDATE medidores_list SET data = DATE '2025-12-10'
 WHERE id IN (
  '6dee6732-063f-4c54-87c7-2824a758ce4a',
  '871aee55-1817-4597-b873-9de9e9281d07',
  'bb51d31c-23b6-403a-9bf0-3e93773e28b5',
  '8a071038-b85b-444e-aa95-e28830441a5f',
  '9493cde7-7e4d-4906-977e-c621c4f4918a',
  'e9d0bbae-ed78-44cd-adad-13355269b783',
  '4da4909d-8edd-4f77-ae9d-4d8729c97384',
  '54faf418-2019-46df-bd11-4916213fdae9',
  'd89ed35f-9464-4f77-954d-beacfe99fbd0',
  '0ea57532-bf5f-4eb5-843b-c721210484dd',
  '9cd5d8b8-167c-45ee-979b-b0213bfab92e',
  '7f107381-aec4-4d10-a5a5-0667701c948d',
  '112fd664-9673-4dc4-9d72-e2cbc88becdb',
  '9b238ea4-b815-456e-929b-b249d490296a',
  '1ac8351f-7ad9-44ac-8812-4df8afbfc66c',
  '892244bb-4983-455b-a01a-cf71fb90af0b',
  'bf31fa0c-e885-417e-94d8-295b6cf9599b',
  'f28993b1-8e6f-458c-9c31-cd8e8ceba1b1',
  'd3568355-ce54-43f8-9a70-4707074d33c3',
  '78bf6809-5f20-48e8-9b28-9823af456afa',
  '3d7c5140-54d2-46e1-a690-f8c7d0119acf',
  'de9c5608-5c75-422f-b667-affa55082b7f',
  '1d75e7cc-4882-47bc-b7a1-5a1217bb102e',
  '3c587091-6853-4237-9873-75149936afd1',
  '74a96c7b-595b-4f1c-8b1f-ba6793f69213',
  '01f03ca1-80f2-477b-b789-6834b272c8ce',
  '43d146a4-5496-4217-9810-c33e65476752'
 );

UPDATE medidores_list SET data = DATE '2025-12-11'
 WHERE id IN (
  '4d0c6c68-8701-4019-b03f-827f26b6163f',
  '5375691c-cafc-4519-9112-d105d0d8e1c0',
  '71c97d96-e9de-4a5c-b8d3-705a73814957',
  'f0e97aa1-e0a5-479f-9608-47a1e322b504',
  '23f979eb-0bc4-4c40-9afa-ddbd7ca700dc',
  '7d9879bb-31e8-4300-9fa1-a47ac511ec99',
  'df74896e-6120-4230-85b5-064771362ecb',
  'bad8b1ca-784b-461f-ad53-c648db548c99',
  '43259638-c337-499f-81ba-4fc21ac72a40',
  '9cefda64-fa06-4ed2-ac5a-9411301e4931',
  '663ec110-c7da-4400-b880-03e9b50e7e10',
  '5878283d-a167-4589-9e17-3910c6ca63be',
  'd63d39a0-ef4b-493e-8383-3d266bd86e5a',
  '0e5af34c-4197-4182-9c7f-b5dd8af7c5cd',
  '651b0618-25b3-4d38-96e7-15856b1a59f7',
  '57d08fbd-12c0-41b9-b14d-c2234c169e8a',
  '1a5f5c4a-3739-45b2-a12a-47c6b0dec17e',
  'b9399cf7-fa80-4c75-a95a-f4fbbce6805f',
  '7cc32b05-9887-4a49-b7c3-ccc0c2ae3f51',
  '334db489-e969-433a-8e6d-7a44aed421d4',
  '0eb21b5c-31aa-4b58-9e4a-f3eee3b54648',
  'e37fa04a-3f79-47a7-9486-603a2dcb3345',
  '09d2410b-c485-4606-97bd-0a15f7a9a141',
  '41e5fd20-220d-4489-974a-53b984c48aa2',
  '0ca1c922-48a5-4ae5-9e45-bd9dcb5ba6cb',
  'b23996dd-0651-47fe-a239-abe4fd8d5677',
  '89edb38d-fcca-43b6-8d1c-2c9f02643265',
  'ba751951-cc26-4801-a944-8d116af540c4',
  '6dfd1b55-b215-4f74-9989-7a919c417938',
  '6b702f11-bdbc-4308-b80a-f153890db63d',
  '0058c226-51f3-4e18-b0c1-5795f48177bf',
  '21c07a58-448c-4568-a025-5fdbb0873f9f',
  'af9eb158-9728-4db5-b32c-182fc07ec5ae',
  '7c445209-4f75-4221-a08b-b1489d488c81',
  '5ad4c48b-c56e-42c2-9225-7d1e5357ec2d',
  '7da8a1d0-34dc-471a-9816-fcb99dcf0b4b',
  'abddbe57-d5ec-46be-ae42-b7880ae963fc',
  'f39e7b6c-0454-4b25-afee-063852ed74a6',
  '5fcf51be-8208-4510-8543-af469502b8fd',
  '7797da0b-37e1-4401-b297-7ef24ef51a48',
  'dce84246-013e-4661-8e85-b0f1810ca4ef',
  '0ab65a1a-5007-420a-89b6-2db9b5e66bcd',
  'ba545e4b-6fb4-4389-abb2-0dee8064cac5',
  '59c2f284-ff1b-41cd-bba4-f10f1b0f4284',
  '81496aba-caeb-4d0c-9396-3fc50e5be718',
  '43d4890e-4c5a-443c-b966-12f32052429e',
  '0e425f43-6cec-4dcc-8845-676c87074d18',
  '74dbac6d-16bf-41cb-b1af-c6f98d65ed76',
  '1e72b049-e41d-436f-a933-98ee5b7775cf',
  'fdca0064-ccd5-4d8e-9c26-e4878c1381aa',
  'b8a4fe1d-e4f6-420b-87be-a9a2e19ddf74',
  'b549d1cc-b652-455c-9546-644a390dce0c',
  '81bd1006-38ab-4b77-9209-e3f11cad5621',
  '5c6c7079-6dfa-47ca-b62c-9e47432f7841',
  '2e4778ef-f30d-49e2-bc02-f33ca62fcf22',
  'fd3c971f-1fe4-4e20-9e79-eb29167baa8d',
  'e950fa18-cd3f-45ec-8376-fd4e98678574',
  'ce64b80d-6190-45f3-af01-3e9b399f6cb7',
  '1d3fdd27-5db1-4a19-a3e0-a065233bc2a8',
  'e6394754-23e9-4575-97f6-c6044ab9d315',
  'e0b83b5d-10d0-416b-a42f-386b7fb1e254',
  '522f5a3d-68ce-4d70-8d1d-6fdd599d7759',
  'b66d29e8-b63b-4a89-8b06-762d58168837',
  '9383b9ae-4956-4bd3-9e34-a33bbee0da4c',
  '183e767d-335b-4bc7-b2af-99c8440949df',
  'd44fe9a0-0bfd-444f-b6f0-3b6512069e6b',
  '7285c86e-6c7b-4efc-be9e-a4ba09dbdad6',
  'c64f818c-3822-4322-96e7-e8c83ed6595a',
  '4fc13e54-77e5-4d18-a7d6-f66bcd1743b6',
  '20d33e18-75ea-4e0e-bbba-e50a2702043a',
  'e9e31756-0ba0-4631-8866-fb78117b5e16',
  '7291ed04-7ae9-4768-b8ce-ee6d21ed60ce',
  '4d932140-62cb-495f-a17a-ce44daefcc91',
  '1fb4e8ca-6a1a-40da-a5ce-63f7c2bfc3a9',
  '610ec90b-89ae-4311-9261-2536266afdc1',
  '29c2b78b-31d2-4115-b18d-fd63d642cd28',
  '6344f488-72c9-42c1-8ff3-55b11a0e15b5',
  '63e388f5-1a4d-44df-88c9-b4a0454d75dd',
  '1c74ac3a-de4d-4d1a-9d4a-416caba2c0e5',
  '2665054e-ac12-4c68-9572-a474cbdc45a8',
  'b6c14cc2-1c0c-4252-b9ac-3fca8de8da0f',
  'b92ecd2f-0946-4624-9a46-9925e30a5a01',
  '84c1a03c-4fad-44c5-aa24-ada60f702e0f',
  '0243c9aa-705d-424f-80ee-02799855b673',
  '10c345f2-173b-4028-a521-b735c89cce98',
  'ab1e3560-35ea-4736-939d-e7532b8be69d',
  '9529abb6-105c-4ada-bfdc-0314aced2d91'
 );

UPDATE medidores_list SET data = DATE '2025-12-12'
 WHERE id IN (
  'ed5a9e33-1262-44e9-a7bc-9eb174127cbc',
  '2755eb54-11e5-42f1-95ef-eb24755f3d0c'
 );

UPDATE medidores_list SET data = DATE '2026-02-04'
 WHERE id IN (
  '890ef407-2fc2-46f1-8319-0d3902941278',
  'fb026bc5-401d-4dc3-a2cd-81ffbbce1416'
 );

UPDATE medidores_list SET data = DATE '2026-02-06'
 WHERE id IN (
  '3651cdfb-d8f5-47f0-8f8a-94f94ed7aa66',
  '84219091-852c-4f24-a90d-d1059382109d',
  '33661ede-beac-4c05-8c1c-09fe1c0879e0',
  'beff74b2-81e8-4592-81d9-78e6cb1e0c77',
  '80fefae7-1819-4bc3-92c7-859450480591'
 );

UPDATE medidores_list SET data = DATE '2026-02-09'
 WHERE id IN (
  '9d1a2c1b-c077-4dca-a864-15b93edaac35',
  'c5658592-8baf-4ec9-9d2c-1c9f2317b5cf',
  '3a5d015d-3c28-4df9-9979-b92dff022053',
  'e645ad94-98b3-48ea-a900-edaa1b9e797c',
  'f691a8ab-11ce-4479-a726-8ba180cda63c',
  '90dc3652-bbbf-4d26-8210-a1188fa6e1f2',
  '03764635-adfe-4785-8b0a-c4811300623e',
  '617ccf4c-2c54-4b24-bc6d-c614444eb713',
  '7321adfe-10d8-4d7f-ae08-dee34064471b',
  '34cdee8b-8070-4b66-9b0b-d306b6a4af51',
  '03012328-c460-4fcb-bffd-baa21f3a08b2',
  '2c1f94e8-9846-46b2-b80b-2f6c5565dd99',
  '9c70fe71-9ba8-443a-b1c7-800308a405f5',
  '500e6484-c27b-4fdf-98f7-3888bf990a1a'
 );

UPDATE medidores_list SET data = DATE '2026-02-10'
 WHERE id IN (
  'e0aed502-71b3-4194-a10e-1feadccc5694'
 );

UPDATE medidores_list SET data = DATE '2026-03-02'
 WHERE id IN (
  '242cb101-d538-4703-a17f-2d10329f3c4f'
 );

UPDATE medidores_list SET data = DATE '2026-03-06'
 WHERE id IN (
  '1bc6b162-8b1c-4846-b2e0-de3eebe7c6d1',
  'ca519e75-1064-411d-a23c-803cd20de65d',
  'c80bf4e7-3f16-45d4-bce3-970949debede',
  '5818125f-0eea-43be-b344-8d8c10c25675',
  '213c7888-96d2-4781-bc6c-f74a51e31172'
 );

UPDATE medidores_list SET data = DATE '2026-03-09'
 WHERE id IN (
  '779dded7-c9ca-421a-8a4c-c66379a36dbe',
  '0a15c5ec-b612-41f5-aade-e0842b4f8887',
  '9265a42a-0e61-4d2f-bba5-83cf7f267e48',
  '42cb775c-23b0-4b20-9905-a8875b4dea3d',
  '463358a5-0e4d-478a-80ca-be1f953e0015',
  '250c9204-8fed-4bbc-8645-dbb40e61807a',
  'daf4d230-1e97-4a61-8fe5-dcdc83b9d3b4',
  '59127019-ae9d-43c6-ae28-cb571cd33007',
  '3777d1c7-cf37-41b0-82cb-57f61c71a550',
  'e577b822-2963-489d-a346-bf89386c55bd',
  '5b0439b8-7307-4e91-9171-13d94d9e5d52'
 );

UPDATE medidores_list SET data = DATE '2026-03-10'
 WHERE id IN (
  '9cba6beb-429d-4382-8451-639a3e9a739e',
  'bb3aadf9-26e0-4c22-939e-15c3c0d0219f'
 );

UPDATE medidores_list SET data = DATE '2026-03-12'
 WHERE id IN (
  'c863b4e0-9515-4afc-8af8-9528d938c240'
 );

UPDATE medidores_list SET data = DATE '2026-04-01'
 WHERE id IN (
  '82657176-e2cd-4165-960a-6d7ee16527c6',
  '122b8826-3c13-4e2b-a6a5-911c6df0c744'
 );

UPDATE medidores_list SET data = DATE '2026-04-02'
 WHERE id IN (
  '812fa4f1-1fdf-4f28-854f-97da5c87d18e',
  '62c6ada1-b4d6-4eb5-9355-dc45d45cd69b',
  '7c1c4541-336b-40b5-b420-ad883330dca2'
 );

UPDATE medidores_list SET data = DATE '2026-04-06'
 WHERE id IN (
  '62353a36-aef3-43f5-97c4-0d8e7d34be3e',
  'c3735901-fd32-46a0-a5f0-60dd078e6629',
  'e4ca8a6e-6fff-4c2a-ae2f-7c7d979a93c4',
  '82697bbf-2cb7-4a7b-82d5-8be26d0ec65e'
 );

UPDATE medidores_list SET data = DATE '2026-04-08'
 WHERE id IN (
  'e1eb06e3-48f9-4e24-aead-de015d61e7ba',
  '5c302aad-ba7e-4d73-90c3-133abb93c8f6',
  '01b6a1b7-fc23-44aa-a8cf-9151446d67db',
  'cc9a0d10-c946-4899-9718-ef8162643d88',
  'e01b8582-a307-4c7e-8de0-24c333fe98be',
  'be0ea0e3-6bb2-43f8-af4d-a417885ac178',
  '3bfa8e2d-4521-4ccd-9ac2-c53d6719772e',
  'f07266ef-ca2c-4d74-a8af-08db39921965',
  '5d5a5b3a-9573-4655-b0d9-f2074894cb4c',
  'f11e9570-b3d9-49c2-9fd7-cdb91cc0a6f3',
  '6eed1d6f-08c9-4e8a-b83b-b5d338f7ba6c',
  '020e9cec-0a1c-410b-9a73-d62bca13c31b',
  '9aa521bb-ed2f-4a94-b381-8e420d6a53b7',
  'fc98b34b-6bfd-4d02-9642-1e93764c8923',
  '7ffffd44-ea45-4713-864b-b9a344f8801c',
  'ce55138c-05e0-4a27-a041-6e3dd3d77e97',
  '98ec1bc9-5652-4f40-adb1-ed21ed23c4fa',
  '11bb5a1b-a93c-47b7-9f80-626ce17a8e89',
  '0b115351-ce06-4f0a-a096-2b4b3821a209',
  'ad7aa3c1-88d2-4774-b303-9ac393006ac9',
  '7bf96df1-1d1b-491b-a8ef-37db590594b1',
  '1b50df2e-1a8f-48df-9a2b-001533f12fa4'
 );

UPDATE medidores_list SET data = DATE '2026-04-09'
 WHERE id IN (
  '6e182cef-51ac-4beb-8a81-56ef018748cc',
  '26219e99-beee-46d5-bb5c-6b04576d8adc',
  '6d6f597f-366b-40eb-b07c-3184a1a2ec5f',
  '49c6da9f-331e-493d-82db-136d82da3057',
  '543b95cc-4b23-40a1-b3a2-5a4fb26caf0e',
  'cd089599-e9a4-4add-9d3d-a24a458b5600',
  'aee4522a-16e4-4e78-91bc-b4256093a5bb',
  'a98380df-09b1-4395-b1ac-90290ff19aa7',
  '3b06ed9c-8c0f-4b45-ad68-a06e557b40e8',
  'eecfb5f6-587c-431d-80b4-c703851c4636',
  'db94801f-d579-41b5-b074-29674d36e487',
  'e6fce0cb-06f8-4cf2-acc5-b400f2cf93dd',
  'e8058639-baf2-410a-b1d2-bb638732db0c',
  'f7f7ba05-9912-421b-8734-3785eef38f05'
 );

UPDATE medidores_list SET data = DATE '2026-04-10'
 WHERE id IN (
  '4e5684ff-3e43-464c-8b85-94d7390e0ef6',
  'b84a4b7e-f0fb-4081-94cb-797bb6d7a6c6',
  'd1c162cd-8145-4691-a7dc-af24a5fc3605'
 );

UPDATE medidores_list SET data = DATE '2026-05-04'
 WHERE id IN (
  'efcc6ed4-864f-4b01-a233-967161d3e9eb',
  '7abc0038-6ff4-443a-8e01-11c5b099c7e0',
  '7a54f1b2-3327-4dc2-bfc2-e64c77261a43',
  'c39050d2-1bb2-40e1-878f-f0b658097451',
  '1e8fc82d-7d75-4e5b-83d5-1b8cda0ecd43',
  'c9951c90-e8bb-4d03-bbb0-e686d1e2b7a1',
  '43e2351e-bb14-485a-b494-f42f1465a09d',
  '8c1a8350-e665-438f-8885-9a1adcf3a85f',
  'f27f9eab-0b9a-4b0e-9f07-1121200bea84',
  '017c81c7-2077-4e11-9725-d94f0c562ab7',
  '6f1f9420-fd13-4618-854e-c90c80defde3',
  '396f8b17-62ca-4ce2-a82e-a3f75835709a',
  '2fee25f4-8cdd-4bd2-a6a1-f5ad66b9dfa1',
  '0e4ed8e7-3313-45e2-a595-7dd7ed1a81fc',
  '1d6d65b4-18cb-42f9-b425-e332423e05da',
  'a6ac8e60-2c61-40bc-bb6c-518d5d806f5d',
  'dcc69f33-472d-4452-acac-1293497fd0f2',
  'b1cd0195-4a6c-4eff-b40b-e9aa48cec619',
  '50c33eff-df98-461f-bb8d-b3a25a4e69d1',
  '50d79fe7-780d-471e-a0cf-0a0fee7b6ea5',
  'f70f8edd-ea18-4cb9-8c39-343f061b6f58',
  '28154729-4b19-444b-a827-b9efc3bcaa44',
  'dbd03ab1-764b-46df-8645-1aa50a4109eb',
  '7774d305-2455-42a5-8425-51bd2c1d65d6',
  '6ce3628c-6633-4598-9134-6cecfee68cff',
  'ef1472d7-1fad-400c-b6a1-6e38d1e7ca7c',
  '7d12d10b-b63a-4dfe-bd13-28e20e8fab22',
  'e1d4d018-27c9-43f1-98e5-b3740a935030',
  'e333926d-a13c-46b8-9fd1-d1bcc908cd7b',
  'ea9f5603-5b30-4748-a96d-54fca15a7b40',
  '72c17a02-c285-4659-853f-2ba757a09fa0',
  'd1f994cb-8594-4376-8648-86a7161018c0',
  '0b064a14-e9de-46f2-9233-577fbb68a5a9',
  '364b23dd-faeb-478b-a637-022843bdfb3e',
  '30ce8f61-d5b4-4db7-87db-af07f86861ec',
  '531d9e02-62c1-4060-84af-62298c162f71',
  '4d7cc2d9-def9-4f38-8635-de1d33e94e59',
  '48f07466-f265-4772-8a89-66e62d2d2cdb',
  '5fb085bd-ef56-4e35-9801-225f0d33934b',
  '7a67d884-b869-4903-82ef-ec515f1a7d49',
  '727f7027-0c6b-4254-9037-d900122def60',
  '3516b06f-f9d3-4e2d-a954-099977b2171a',
  '087f32d0-4d34-4231-af51-dd909d004d76',
  'e9a80fe8-9e99-4fce-947c-5b4734b3b8b3',
  'e7a9f381-3801-4863-bd44-0fcd02e6fad3',
  'e382188b-2f86-4f45-ac36-092a28233b72',
  '95f68f28-42b6-4eb9-8475-10c575a49490',
  'af5b527c-735e-4b4e-9139-8f50bf290a77',
  '2429af2f-9abc-42ba-93a6-9ef111d36478',
  'a6dcc230-29b3-4e63-a279-a9bc2db7a382',
  '5b0ff746-c274-4e92-abae-10cb8eff0aec',
  '9ba1ac87-0206-4163-a00f-564a5be1787d',
  'cf049ab8-0eac-4ef7-8f76-a3eeb49af182',
  'c5679c08-9a14-4118-914b-7fb7e0a0beb5',
  '64ab29cd-7124-4876-8c6e-3abecf218489',
  '08dc44ca-ee26-4951-a83e-6b174c4cc9fa',
  '8090bb4f-c984-4b79-b22d-2030001de916',
  '665f856a-450e-4157-b29f-f181607547b8',
  '5a940613-2916-4745-b139-4617d435067c',
  '37cad368-2485-443b-ac27-6b2cbbd15680',
  '0bb4d589-133c-47d5-9cba-6dc5bfb478c3',
  '05a6526e-6f89-41d0-b0cc-53c3a0442b5b',
  '87f837e5-6ae8-4ab3-a8ab-dffd942e8185',
  'f2a09ec2-5b8c-4d9d-ace7-7e479c4cd97f',
  'c4e387da-ca05-4a70-99f2-360f1595e80c',
  '3b113b62-6c5b-4752-933f-c00e783af0a2',
  '1b1549e2-d6af-4056-87d7-00b00d787d7c',
  '44b11fa2-0921-4445-bcb0-d8d1b2e96057',
  '485f9b3c-02ff-4f15-b47e-a919093a3df5',
  'e48ed5af-c40b-43c4-9019-3a1f681294d3',
  'c1a843bf-61d8-48cb-97db-3da8b2b04a4c',
  '049e68cf-2a97-4759-b542-f04f8896d25e'
 );

UPDATE medidores_list SET data = DATE '2026-05-05'
 WHERE id IN (
  '17075b61-3db7-4238-ab20-8e4dee7a26e4',
  '39a0c6f1-c60c-4a33-a84e-d621ba3ee580'
 );

UPDATE medidores_list SET data = DATE '2026-05-06'
 WHERE id IN (
  '89ca04a6-73dd-430f-8ad9-12a61bb45e06',
  '941d806b-9da4-442b-a70b-b62682648a3a',
  '1186ec39-42af-43c2-833f-24451c4cffd1',
  'e7adfd13-1bc5-4e84-a3ff-9feaa95d351d',
  'c73cd3c3-f89a-4b8e-8464-c7af2f1279ce',
  '514e7492-81b8-49ce-9d5f-cf9696ab65f6',
  '3b324ec7-80e5-47be-93c0-c7d1c1b86ccd'
 );

UPDATE medidores_list SET data = DATE '2026-05-07'
 WHERE id IN (
  'd157d312-8111-4667-82c3-8145cfb16515'
 );

UPDATE medidores_list SET data = DATE '2026-05-08'
 WHERE id IN (
  '4846f8c6-7b0f-4018-899a-dfe60abb7edc',
  '495ee3a7-08e8-469f-bac6-62663a4fe0cb',
  '433477c0-5d67-40b3-b25f-64390c930eaa'
 );

UPDATE medidores_list SET data = DATE '2026-05-11'
 WHERE id IN (
  'cfc77369-f790-44b5-987a-adfe21334f45'
 );

UPDATE medidores_list SET data = DATE '2026-05-12'
 WHERE id IN (
  'b4f781f0-8d8e-45fd-ab9b-aa0f09f626a9'
 );

UPDATE medidores_list SET data = DATE '2026-06-03'
 WHERE id IN (
  '88003707-c74d-4342-90f6-b837c472fd93',
  '0e67a821-ea72-41a9-aa74-177869a484ff',
  'afc6d020-276c-4181-9ad3-a5816a89301b',
  '734f1250-847d-4f31-a9ef-a7fec00f543a',
  '0fb2c5f7-88e7-4322-bfd9-8724ced8af10',
  '4cbd6fcb-3708-4e2f-8648-ed37f09d59bd',
  '3e7b6fac-2528-4373-bba1-9e9e430b2098',
  '1db31ed9-c061-4939-beef-a222941520cf',
  '343b370d-ebfd-440f-bf03-91f554b89d0b',
  '704fd281-18f3-4ad7-a2bf-855f7af09f1b',
  '35e72ad8-c8d7-459c-b8fe-86a293ab3345',
  '5d3d6ed5-f9bd-4e0d-94a8-46cd96d4a278',
  'a388519d-7340-4f94-9eff-e417f4d63a37',
  '7daf14a6-5a90-4c84-abd9-5c07ad417984',
  'ed9121c7-1192-4ff2-b854-4335efa21491',
  '52e5de33-4eef-406c-a44d-c54fc075dcc6',
  '245d356b-ed00-4ee7-abdd-1975a7502ad2',
  '3e5041d4-86ed-469a-b8b6-6dc6b342ad12',
  'd7e61758-c4c1-41f8-9daf-b18768cca7b7',
  '5d6ee696-31b3-4a4b-add2-eec08f5a422c',
  'b3982bbd-09be-4a6c-b2cc-d58c2b6bc802',
  'e0f33226-2e57-4202-a3de-82ad4b28dfee',
  'cdb6aa9a-4854-4926-be8a-82f621c41885',
  '5bda0238-c4b0-4de5-a48e-ee85cad0cafa',
  'c05357bb-bc9c-4abd-8aeb-c23a4666eb40',
  'c1dd26cd-3b0a-46bd-b47c-2d57f2e059f0',
  '2d924736-b42b-4b69-b03e-97667d0f48a0',
  'cb022130-aa10-4164-94f5-637df86999d8',
  'b3953b5a-0cab-4ee7-b9e9-7d0bf81819ab',
  '1c740b38-02bb-4d40-8d8c-c900b6a4ec0f',
  'fd7a7125-3f6b-43f7-9f8b-aca597eb4881',
  'a7fb5bd5-1d54-4f93-a076-7c05c3a5750a',
  '4948c61a-7c60-46d8-885c-7abdf13e1733',
  'd78f6cd5-9afd-48e3-a3a2-162d460a7df0',
  '2099a8c6-848e-49fe-afe7-3a725707d222',
  'e03f7155-d507-403a-9cd1-733fae948375',
  '911df56b-34d4-414a-ba01-63790dad76ea',
  '1032f056-7776-4831-8cba-b914e970f3f4',
  '7821c7a4-80be-4701-872d-cbeb3e2707b3',
  'd9dc012e-5036-49e4-957c-006cb7b70fa9'
 );

UPDATE medidores_list SET data = DATE '2026-06-04'
 WHERE id IN (
  'f87c94a4-ddd7-4e44-9489-5622da235f3c',
  '775e7eb5-5f94-4549-ac46-7d2f09b26367',
  '3c6bf32c-0e5d-4194-9562-fdc49342e543',
  '783075fd-3ac7-483b-af43-bf9635a59b3c',
  '066f0bbd-ca1a-4d8e-b58f-28a2f034cb5e',
  '7ca4f7c2-ae73-4c10-9908-d7469526bdf0',
  '57767506-161e-4d9c-ac5c-612c16a0edcb',
  '3f7eb630-ac10-446a-873d-ef6330d6b95f',
  'dbad83ce-b447-4021-9816-d07117874802',
  '3315ca5a-1aba-4f0d-918e-4acfeff974b8',
  '3d6d62f4-e90f-4d3b-bdb0-d6a9f449ea93',
  '2a857652-3e6c-4cbf-9d72-a7d206cc8162',
  'e6b2548c-8d23-4660-b466-d4092317b9a8',
  'e7094bf0-d196-4bbc-8542-f3f614b85ec7',
  'b40bec62-d569-4127-8363-93bac78db222',
  'f8769aef-30a3-4b69-91a0-6106a6851776',
  'a91f7e04-5053-4de4-97e1-200b18080f62',
  'd55620c9-07e0-4f67-a4ee-a8598507aacd',
  '8cf70a77-18f6-40db-97ef-e907abaee3cd',
  '48f461df-964a-4ccf-8ef1-59f909114103',
  '4f4db8de-e538-4e81-b194-eba05f9f3c6f',
  'b816b6ab-8c57-4df0-abc9-8ec638e355e3',
  '262139b4-e6da-424b-bea0-e14eb4aa0a9f',
  '7e340298-1b3e-4ecf-9ff7-5a66066846f9',
  '8fae3e29-b9ec-4f5e-aeaf-8eac279bdde9',
  '586a80dc-01d4-4650-a6c0-818dd6c189f5',
  'a02fc72a-333a-47a1-9370-2a05b7ffa14f',
  '0ce352d7-834e-465e-95c5-e10602bae38f',
  '5cd57fe2-88e8-45e1-9ffc-c5e388d2356a',
  '9bf3c0bb-8da9-4b02-907e-7154d4d90df9',
  '248e19e3-c75d-4c0f-945c-1ec1b3b905cd',
  '12cceb61-efa7-4b6a-98e9-0b856359d7b3',
  '9e464ca7-1b48-4c96-b172-4794fa8981a7',
  '02b0c5ab-5a1e-4a9f-8d06-ab16680f2618',
  'd5da6e16-f08e-4dc5-8dbe-178c1d788b9c',
  '9a65c6e5-2f88-422e-802c-5e4cdcfb186c',
  '3678245f-3cb8-485b-b1a8-da8b43a9489e',
  '5027377f-369c-4f76-862f-0a9abe167ea0',
  'dc6adfc7-179d-4e13-a3d7-c11c4c27e22d',
  '26424248-7b4c-456c-92f9-8324377cf015',
  '1df145df-fd12-44a3-80cd-aa95f8d242da',
  'b8f7e0b6-a449-4380-9eb2-7bde08710fbd',
  'd16a4f37-4656-4278-b533-1852f0632702',
  '476681de-c780-483d-9626-704d15213257',
  '742d8e3f-bcde-457f-b489-1ea63a28726a',
  'd3aba6c7-093d-437a-9a09-f5555f898715',
  '5ee306e9-7ac8-46e8-8b5a-72a9fcd90b1c',
  '71bffee5-b41f-4b25-b61d-16d85b0db749',
  'd1120569-e9ea-4351-82fc-cdf46b0f5351',
  'b61848a0-bc15-46f6-82b4-1f2e46eedf90',
  '84f2c262-d7bf-46d8-ba37-cabeff633471',
  '0893af1d-5bff-4d48-abf6-44352d8aff7e',
  'd4531641-802d-4363-b749-ac9fa0b68e8d',
  '9b4860c2-b094-40dc-944e-de32f94cbbfd',
  '6af043d5-9f75-4114-b5c1-77c83a97eda8',
  '2dece740-088e-4d34-b869-7a39f921f8f3',
  '14d0f4ab-b13a-4574-bd57-0178c77583b5',
  '763c3830-9d20-44e7-914c-e70fa9155e7c',
  'bdd3a46a-cbc5-477a-b554-b4a2f936c1fa',
  '5d69fca9-0b2c-4977-80a7-be4d8c63f5b2',
  'f5ff8f1c-e6b3-4b48-829c-b919136587fa',
  '5511b7d5-d129-4460-aa8d-58187d7333dd',
  '6c234c1b-f68d-4415-ab5a-5edccd6a5981',
  '39b87046-0c2a-4311-b7e8-e4a1734fbb23',
  '72a7b2ac-3e97-4775-9fb6-7ad96c00ed6e',
  '9a20280c-33c1-4d64-aaa1-751e237eaed7',
  '33610898-0b27-41a2-9938-886d85c5440b',
  '644a63f7-f271-4f14-ab41-2699126d1f48',
  '67612e80-b55c-40b8-bbbe-3a9a96c8e8bd',
  '06246b4a-8b55-4e15-a91c-495104c01fe8',
  'ea1bbb77-673c-4d69-a471-a521325aea09',
  'ca9e1e93-1e8e-4316-9113-a8bded42df7b',
  '31f9fc83-1b51-49b9-b553-26696ea3d370',
  '226240b4-eb58-48c1-b5db-b984ee9475b7',
  'd81a7b93-7cfd-46bd-be5b-ea13886e1876',
  'ec053864-c465-45c9-88dc-d10bd4dd10d9',
  '476b95d3-2b93-46eb-8fe8-8d8ff52ac574',
  '332319d2-f4fd-4a36-9c2b-0de2e448ba37',
  'f37da242-1dbc-4629-8a6b-419dc8803b0c',
  'ead4a784-b011-4f6f-bead-b74d7f4027d8',
  'd8dc0c18-7efa-4556-aa81-011c0cf23976',
  '81890382-8713-45a2-a470-189d7b8ee3b6',
  '86d49487-bbf9-4d57-8979-4ee62eeb6166',
  'fa76a9c6-ba4d-4c46-99cb-e12cf849c265',
  'a84f5028-bce9-4eb8-843e-11a1a265ba7c',
  'c1c2dec1-fad9-4afc-9b75-eff260d755bf',
  '52e8f3bd-950e-438c-9e61-1b18ef101f9c',
  '39c91541-2b88-4001-85f3-8932ea21122d',
  '379e620e-928e-4ae8-9cce-903386a6a62b',
  'c2f0b55d-7aa5-4959-b47f-1a6429d2069d',
  '32940977-e2d8-4b1c-9e95-d4dfc8eea405',
  '6cc51c84-9703-407a-9609-b12dc301738d',
  '0b206fbc-e720-49e9-b793-e7283d1f7645',
  '563a0151-17ef-4cef-97aa-77af94e63b1b',
  '3c336b52-3b8c-4717-987e-92250b87be96',
  '4de11d6e-dbea-4bbd-a7c0-68eb1285e2a8',
  '0ae6dd86-5e8c-416e-bf78-1ed78c266041',
  'c5d85dbe-593e-499a-a007-679274e34313',
  '372b0388-22d5-40e6-a93d-98cbdbdf76dd',
  'ed00079f-f361-4414-966a-c8a1df5deaaa',
  'b4ed679a-d8e3-42d7-a939-4e5caa5d8051',
  'e6e2a4a8-d391-4ad9-a523-6416c25f7756',
  'f8dc97fb-9f54-47d9-a208-f0038781353d',
  '1055b293-3f66-486e-a67c-e33fb77c1f19',
  '6e46a512-a1c9-4178-9437-1fcd429c6cad',
  '4dc67eb1-0e79-462a-8556-9c3afd341b06',
  '61fc57b4-a040-4a56-9517-f755b059e78b',
  '6b084772-5962-450f-b48a-e82b7b04b5f9',
  'a611fd5a-7b42-4eaa-bb4b-7e43d2174183',
  'debe08c5-f618-474f-b7c9-fa730d6dc5cf',
  'ca77b6ff-f68f-44d2-ac0c-c1d6d38c2bdc',
  'd68cd8dc-b7d6-413d-9331-3491b265d92c',
  'e64303f1-539a-43a6-b5bb-6dc792876986',
  'e9dccb61-4877-441c-b46d-73d59a5f34fb',
  'f6f00270-eea1-4ab2-830d-ad8f96d041ef',
  'fd67fbf9-150a-42e7-8838-2ae9dda802b4',
  '39b22504-941b-4844-a8d9-c14da68828e7',
  'e83481ae-007d-48dc-8071-b0e995bbecb5',
  '65ae2a56-aa21-48e8-bbcf-438a018fb367',
  'a9ea9268-d2e0-47ee-8e8b-10d93e7a24fa',
  '566f018c-fccd-41f0-a529-c66698b21c01',
  '36ed8cbb-3d72-426b-b2e8-adf210621c17',
  '4a452ed7-e8f8-44c8-85c1-2eda5f26c39e',
  '359d26e9-550e-48f6-a7eb-aa3b0de07250',
  '76729c6b-1a7a-4efd-abcb-1672d960450f',
  '10a67bc0-ecd6-4057-8aa5-0d0418b56d11',
  'e6253fd6-ce5c-4af1-84e5-5b1d2acb381f',
  'cc0e72b8-7da9-46be-b60f-f3e7eccde0ac',
  'b3d31eac-8b36-4e14-96dd-fbca24a5718b',
  '27fea257-df34-44a1-92e0-ebf494862c5a',
  '85b5b929-5d53-4fe8-9df3-0b3e365e0882',
  'bf4e0557-fc59-4251-a3b2-5f3a243060fe',
  'a46b7997-27b5-4531-98cc-d0529ce42b9a'
 );

UPDATE medidores_list SET data = DATE '2026-06-05'
 WHERE id IN (
  '6bba2d9d-26e8-466a-b33e-edda64e5cabf',
  'ff5a2ee6-ef8f-4ec7-b6ef-746ab54cc592',
  'cd20c1b3-c8e1-4807-9292-0643db342396',
  'f1b8eb1d-e664-47de-878d-a671afc5ec4a',
  'ee0c5ac6-c9ff-4d7b-9b52-a2b90231119c',
  '588aa235-0986-4759-8413-c959498082ed',
  '28d6ccbc-d437-40f6-9d77-af2e10e5db54',
  '14f6a7c1-9e7c-4a01-bdfd-68efd9e0c1b0',
  '90441d1f-2868-4036-9b9a-16dc005fff13',
  '5fb283ea-37b9-4653-a45d-edc2378d1a64',
  '889e6f67-d871-4189-ac91-63df6ea9c57e',
  'b548e447-4669-41ad-af6e-154ce837cdc1',
  '5db3f8ac-1670-4597-9691-b16020ed961c',
  'ee709c43-de5b-4e32-b484-4e5e72ec8a60',
  'eb4c8464-e0f1-4ecb-a000-d34797ef8c8c',
  'c15868e0-2cb3-4331-a708-85bc82b6b7be',
  'e31cf513-65d3-469a-98fb-10e17aca347b',
  'cbf6af16-e51a-47d4-af78-3d437576a329',
  '9130a705-558d-4566-a5df-e9eccfd24072',
  '970957a5-5275-48a5-aff9-eace699b12dd',
  'f5047730-ebd2-4e5f-8915-445039ea7209',
  'c80138b9-81e3-4ece-b07f-d28a1f65adb0',
  '0cb5e8ff-15f1-474f-b238-fb551081801e'
 );

UPDATE medidores_list SET data = DATE '2026-06-08'
 WHERE id IN (
  '7b82c5dd-c6c8-4785-a130-4508a6975bca',
  '7acba582-d22f-4186-b4cd-7226c91373cd'
 );

UPDATE medidores_list SET data = DATE '2026-06-09'
 WHERE id IN (
  'ee78285d-66c8-4532-a4be-864fde77ea1a',
  'f55bc14a-4328-470f-bf6d-51a27e309862',
  '59531c9e-df58-468d-ac65-7e1b456c7232',
  '2d9e8f2d-24f0-4711-8bf2-3e7494ffeb23',
  'ffcc6730-7692-4a75-b11c-64d7c7ff0287',
  'ab4dfc8b-0683-4531-909e-1a1874704dfc',
  '0bde36c6-c178-47fa-92ec-3e0eff533d37',
  '6c2b4bcd-5559-4498-bea1-9d836228d9e3',
  'c6068de8-e92d-447d-9f86-8e0990a51b65',
  '9d3c0ecf-7d77-48a9-a26c-1a6dda57c86b',
  'a9265a6f-fec7-491e-93b8-fcde87779bc8',
  '8e0da123-9ad5-44c3-be30-9a2659f694e5',
  '47844ae1-4ce2-4df0-9777-8da511ed64ef',
  '8e0a9be9-d555-43af-b0b3-7d57c2668674',
  'e77e08cb-83d6-4afc-b7fc-2d361f61fcd5',
  '0e72c822-4a05-4634-8b4c-70441c431741',
  '3f7fa091-25a3-482d-be08-abab34ab2727',
  '2ae84f13-9de5-4d66-af03-43792cac5545',
  'f5609c60-366a-44d8-8184-532122959768',
  '5657630a-3ce2-42ba-8778-cb0c821a9dba',
  '1b74cb8c-1f8c-4ae9-a40c-578ef5faef58',
  '621cbd80-6ccc-4917-9003-6ccbff3d2384',
  '95180e95-bca3-4834-be06-9f69fbfebe57',
  '3623126c-5d8a-421c-a7f0-24b78369e447'
 );

UPDATE medidores_list SET data = DATE '2026-06-10'
 WHERE id IN (
  'c4b45a2e-0cb9-4904-9bd2-05ade2820f91',
  '52372e9a-51fd-48c6-a9a7-d334d1a1605b',
  'a036739b-4c2b-45be-8f4d-5227e1f80084',
  '42938499-f9ce-42e7-8c97-80c0f0d5df92',
  '76a4c2b8-e53b-4c86-b3ca-7cfd84c65d0f',
  '3e3b9ee4-3ccd-4f37-9190-63ec2baa1731',
  'e575956f-71f6-4ea8-a30b-b4d4af035167',
  'fcc1cfcd-2858-4958-b2d7-6aaa76ca4647',
  'f3321ee6-7ffc-4d66-91ae-3dc826fd848b',
  '3a0dc6d1-651c-4e92-93e9-b4d3dfd8e5d2',
  'b09807ed-7f18-43af-9d46-6a37b3e6f6eb',
  'f4c41a82-82d7-4459-932d-ba77dba48502'
 );

UPDATE medidores_list SET data = DATE '2026-06-11'
 WHERE id IN (
  '3b9a9ac0-967f-4706-9aa4-60917c9aece0',
  'aac5d3c7-88d9-4e9e-ad09-63e59f291ca9',
  'e728cf96-1db8-40db-ba43-8c13b90e54f3',
  '4ef72265-fab6-4954-8598-cb971d75380d',
  '39fe0678-cb6f-42d2-9344-ba1d65b6266b',
  '6efef143-e91b-4b6e-95d9-362b381df5c9',
  '0b6bb9a8-5ab2-4762-a67e-b9e19450c6c2',
  '3e959ad8-e7aa-453e-a78d-68924fe7ab2a',
  'd11581ec-9a76-4d4e-8ddc-85493251d94a',
  '9ee23b9d-228b-4a33-b7b2-19065c743a07',
  '010e861c-1b4e-4e7f-9d99-2555f54c940e',
  '48c5c4b1-dd8b-4a0b-8014-1f79730fad8f',
  '664e4265-2b8c-409c-8570-35418e6e33cb',
  'dc771018-21d6-476b-839e-cc74d531dff8',
  '545fe874-b280-416a-a7ee-558243b805a0',
  '0a4ae3ce-c641-4321-a2f9-5d7c78ae4561',
  '1849c730-f741-4c2e-a50f-a44314baa93c',
  'aad52bc3-610c-4320-93ae-bdd6ac16e535',
  'f7cc2c1d-1118-47a7-bf49-5833609acac8',
  '6a1b2f7c-ee6f-4b2c-8642-1e246a8a75f5',
  '98b12d2a-2572-4d56-99b3-c8a6351260f1',
  'a4375ce8-e097-4daf-ba25-f21b035166b5',
  '9691c0ec-5163-4b38-8999-e0f4e9c6b031',
  '1c3411f0-d8bc-4fa7-a331-c69ed5aa6efd',
  '5e296666-1642-45c3-8b5e-9c8a112f799e',
  '2349828f-0304-4789-85d2-e19d4f014bc3',
  '0cbd4c45-f5e8-433a-b3ce-fc78decbe2c2',
  'cf68d2b6-2935-4e98-8125-df7f4f43c201',
  'fbc070c8-b7aa-4cc0-a689-a3e60bad1cab',
  '31b6f70e-c9ef-4af4-9388-0023fa8f5bd8',
  '067967c5-d64e-4753-a17b-6c5bfca2a8e6',
  '4b2e0fbf-6647-4adc-9eae-4b3bd30bd82a',
  'c0d4da7e-abe8-4b9d-9d89-33167be10e23',
  '438e4f3b-c8e4-4060-aea8-9d723e344b1c',
  '1e8c82f5-8ea1-43aa-aed0-80c809721e62',
  '9fd0ea83-edc4-4edc-bb48-de5b765d4aee'
 );

UPDATE medidores_list SET data = DATE '2026-06-12'
 WHERE id IN (
  '38cd0fb8-b2d9-48f3-9c36-5ace632161c6',
  '518f2629-4f87-4e2d-b0df-05d39be7f7de',
  'a7c21a16-f13f-420b-abdc-a8caeb1dda25',
  '7da3ee9e-422e-4f33-8b12-6367719ef642',
  '4900d277-41f6-4749-85c8-19b7b49f5012',
  '57246d2e-2422-4bc3-a599-a807352cb20b',
  'e5661d84-dbf2-45c1-b9fc-399a8af1d550',
  'eaba8daf-4942-4c1d-bd0b-853448eb799a',
  'd5ba7320-b1e3-4901-b4d3-623233e28013',
  'ab4c32a0-332a-4260-baa7-d9729a948ad7',
  '7f286d9e-eddc-4589-a466-579f7ef9e9f5',
  'd2ed0f6e-f063-4cf7-af35-a31c05d8c0bb',
  '5da869a4-fc1e-4244-a3c7-e3718ab07a36',
  '6e97ad37-01bc-4a87-92c3-3a90b81070a6',
  '8114d1bc-5f3c-43a0-b866-2fc54b196306',
  '252d8393-df5a-49cd-af86-02f708c15b0f',
  'a4fd8265-2fb9-4a7b-9976-c63ba6ad67fc',
  '70281052-cc14-44a3-96f4-91316dda173c',
  '23f73b59-311f-4250-b2b6-376652d7a49a',
  '3c4dbc92-e570-4e19-9b9a-1292c11f3cd0',
  '407baa6a-46b0-4c19-904f-93a568264883',
  'b03c631e-3df8-46d8-97a0-00a31eb77ff2',
  '0bc9d5b3-3569-4d75-812b-e86ad67113aa',
  'bc786f9a-d949-4ffb-a9c0-2378271bded9',
  '8e35e4a6-85e8-4a74-b500-1aad5b0bb9c3'
 );

UPDATE medidores_list SET data = DATE '2026-07-01'
 WHERE id IN (
  'cacf01e0-3707-41fd-b521-0ff8b2e77617',
  'fae07802-f65f-4bd0-9a5c-d908b9e9fe0a',
  'bc1a55ea-0707-4706-9607-a1aa3ba69d6b',
  'e8d31675-9526-4242-aff1-1a03506df8ae',
  '432842f5-3829-4325-b930-56b1770b2e14',
  'f54e791c-3752-4f99-b58b-b0cb8e35438f',
  '3282f930-3f7b-4e0b-aef1-8e4dfc4ecbbf',
  '22833f43-9a83-4ec9-9f23-fd609667ec82',
  'e877a3e4-7b35-4bfa-8725-2fef7e6322b2',
  '6833776f-e4d2-486f-8863-00b763565329',
  '913cd88c-4a4c-4159-a695-b418d7f3475a',
  '71b591ba-4057-4516-b129-73fe2a7c27be',
  '02a48b31-8332-4ebc-a5ce-38e257e8b022',
  'ad599685-35c1-4b5d-b632-f1e07b4aca37',
  '7eefc8f6-0e35-42a2-91b8-35d661f4be47',
  'c4d1af2b-df36-4119-8b5a-e38e2d93a736',
  '186b0016-5d97-4896-9c2f-4c590bdfadfc',
  'f8521d47-edef-4cf8-a91e-032ff81e82be'
 );

UPDATE medidores_list SET data = DATE '2026-07-03'
 WHERE id IN (
  '0610d45f-6318-4627-bfc4-4b609ae58d9b',
  'a668d378-e5ee-4f6b-b333-cd9d36dc94f5',
  'ac8507ed-62ee-42c1-983e-c5f10124005c',
  'ffff0678-15bb-4597-a02b-6a18fb48df27',
  '6001312c-6c2a-4aeb-ab55-be754d02d398',
  '8c9b2e45-6121-426c-837c-b43dfdef9547',
  '4eb07698-673f-45ed-9425-86aabbec4291',
  '73ab7e22-865b-4e6e-a74d-562a9d588e71',
  '2b79b490-f808-4446-8749-aeaa6493bbbd',
  '5c8f2e0b-b89b-489d-a2b2-a9ed73804471',
  '19bd89e2-e1eb-4845-a51c-43079609ffbf',
  '819b222e-7c58-4d5a-9a5a-d4cc57e75ade',
  '11daadd7-fd78-4e53-9aa7-c864ad1ddb9c',
  'b8cc67dc-52d9-4585-b63e-b582c6dab618',
  '46bb1fc7-4b76-4bc7-998a-9eaaa8f27ee4',
  '0cd3277f-d65e-467b-a6fb-007047eb987a',
  '008c3471-5825-4eb6-8ad1-86977d8595fa',
  'a878dd03-2a50-4451-8771-dbd6a60b3360',
  'd58e23c5-b1d9-421d-8644-231d19f1cdb5',
  'd79f85c1-38ec-4ab7-85c3-42a87b1f7cfe'
 );

UPDATE medidores_list SET data = DATE '2026-07-07'
 WHERE id IN (
  '808d7efb-55d9-4dfd-9282-cbc0adbc0860',
  'f01715f9-d803-4848-a4ee-04c04f03f96d'
 );

UPDATE medidores_list SET data = DATE '2026-07-08'
 WHERE id IN (
  '8c34f2a5-a197-40a2-8d2d-f6fdd53a6497'
 );

UPDATE medidores_list SET data = DATE '2026-07-10'
 WHERE id IN (
  '41307001-4dfe-426c-a528-bded10530b16',
  '74312c3d-44ce-45b5-906c-c7bcdb4382cb',
  '74b109b9-a5e6-4885-a116-7d2395d8674b',
  '8592322a-3ce9-4803-9ee5-c2b95fefb6b3',
  'cc08bf9d-f447-4ae6-926f-e06848970453',
  '245f304f-1823-4320-ba8f-84b52105d476',
  '1a3ea67f-10a3-4544-8725-30ed5b78ca7a'
 );

UPDATE medidores_list SET data = DATE '2026-08-03'
 WHERE id IN (
  '7ed1b653-7290-462b-9499-cb114dbad45a',
  'e84a89f7-935c-406d-91fa-fab8c9b9e9e2',
  '752d8904-2a5a-49e7-a867-6904c78a17c7',
  '8cf0d5de-9afe-4fa3-bd2d-d3b0b9176d44',
  'ad9428a7-6e37-4bea-9636-3d86d4de52f7'
 );

UPDATE medidores_list SET data = DATE '2026-08-04'
 WHERE id IN (
  'e1c4dcc5-cfa1-4ef9-8a89-10df85a718e0',
  '5ed0fc6e-2fdf-4751-8e42-d3f671c4d313',
  '84f060e8-b547-4432-88f3-2e5eac43ffb9',
  'df0919e4-6372-4c45-beae-70f9d1e59fed',
  '7ca6b83a-8ef1-4463-98cb-03d352d9df0a',
  '625c557f-c6f5-4cc4-9615-0fde5d6c1986',
  'a8e8ca88-c853-4d5c-ba87-bc4785f7f32c',
  '450737aa-2cf2-4eeb-803f-6a66b31e9ca8',
  'e5eba219-57ad-47f4-80c8-b9854b2c4513',
  'a3bd3e6d-06e0-4d2b-9527-d6fdf16f289d'
 );

UPDATE medidores_list SET data = DATE '2026-08-05'
 WHERE id IN (
  '210af149-08bd-4dba-aa8e-99de9f63e27d',
  '7138d7fa-f7da-4b1c-8dd8-3ff18c54f801',
  'f603b732-1adf-4b9d-a6b4-f23bfef61e72',
  '07afd6a4-20e4-4a1b-8dd2-b5606583a56d',
  '20e2f737-e9d4-4f73-b7d5-42d47ab9b7bb',
  '303a45c8-f15a-4358-9ddd-4cb147afc375',
  'd01c40db-fc7b-4790-9534-796b99214135',
  '468d44a6-e445-483b-a3d8-84111a66079a',
  'c4e07797-dbd6-4bcc-8d3b-8166b975693f',
  '116d3287-b876-48d8-ae96-80c48d486d9d',
  'e3cfbc0d-59b8-4f73-9d82-a3b3d88a3ed3'
 );

UPDATE medidores_list SET data = DATE '2026-08-06'
 WHERE id IN (
  'd5fc0f98-f2ee-426f-87b3-aca95d548e18',
  '84e57ac0-8804-40d6-8b0e-e84bdb63554e',
  '9665a9f6-f173-42ae-a224-118fdd038f92',
  'c6949fc2-a1e6-48b2-8c5e-f335cadcd7e1',
  '49340ce0-f02f-458e-8138-8ba84ec19748',
  '59d9c1ab-8add-48ec-ba01-4b5e3d5a3fd8',
  '73431d1c-5247-47e4-b48f-fa9a1a7be3e1',
  'b59b3b63-7ae9-438b-906d-ad9cb05b9928',
  '81eb53ba-d54c-45ce-bc91-296bbf175656',
  '25a45fed-b92c-4033-b539-120b1640ebf9',
  '9db53887-7fca-400a-bf1c-4cdd9374c989',
  'e7f5a2f3-70a2-4f3e-b4b8-48ef60c35ef3',
  '7febcede-2d89-47b6-8ded-af11b47628ac',
  '30a029a0-090a-4e0c-ba65-b596a9c3610e',
  'ea6bbf7f-7d4a-48d2-a6ca-8ecac40fb705',
  '0e07816d-c1c1-4d48-8c77-9b318ad7dbc8',
  '5cf0a4f7-7d72-4cbd-984e-f43039f27773',
  '7b68f70c-6449-4e72-ae84-3ed550e75fba',
  '8d5fba5e-7450-43fe-9529-98c3b671aeb3'
 );

UPDATE medidores_list SET data = DATE '2026-08-07'
 WHERE id IN (
  'b1f1a899-1621-41c1-be6b-668d752bbe63',
  '0e2d4d8a-796a-408c-ab3b-214abfeee003',
  'fa486e83-30c2-4c07-ad00-19968902a286',
  '3aef8a31-c884-4b4c-9fd9-d3c752316a48',
  '81e1c512-2f69-4f01-b3d1-77f461fdfefd',
  'c1680941-1374-482e-a3c7-48d9f6ff7948',
  '814a1c88-b437-4d67-ae3e-e23368ed75ba',
  '4fa4152f-ee76-4cb4-90e0-6605d40df4b9',
  '32331722-75f8-451c-90d2-8c5b331b6681',
  'b70fd033-5d79-4567-937e-6cc9516dedb4',
  '48e8e5df-facd-4074-9caa-adf2cf3252ad',
  'b696dfa0-fd21-48d5-b43f-271ed634f48b',
  '2213dca2-c354-481b-a8d3-df06106c8700',
  '0c6b1846-5f03-408d-bb47-df73b7aebeae',
  'fa22958a-93ab-41c5-aba8-551f23fce49d',
  '85f04214-a147-4b7a-83e8-731628156bb9',
  '1a648ce5-c6b8-44bf-9108-1114fa0bb882',
  'c6ba570e-8460-4cf1-a354-98cf49cc6602',
  '08148f38-1238-478f-9dac-f6c3935b1b5b',
  '701b3430-ebad-4573-92b0-f9a60350fcfd',
  '66ae58d2-9ae6-4caf-92a6-6d8891044143',
  '6dbb5b27-e60b-452b-95bc-ff2f5192b60b',
  '11471f1d-7cfd-4ed5-b031-8325e62f5e01',
  '3a1ea659-43f1-4ae8-be2b-58f56be1c60d',
  '6c0854b0-c844-477e-bf0f-9c7f05567037',
  '85d95f61-eb4a-413c-ae1e-625624e50baf',
  '18852d20-1487-4389-947e-5a34d087ce49',
  '4f85cfc1-df00-4f58-bf2a-ac28900b372f',
  'd96abc9e-4ddf-4cb4-aa9d-d7f027783463',
  'bd4f3b0a-a334-424c-9989-de5909c26309',
  'eaafcbb9-9370-427a-8350-5a7cf2288cf4',
  'f05bf779-b265-4549-8829-607d9769f0c9',
  'dc010a78-e11d-4c4e-a418-158b556abebf',
  '2d5ab506-f996-4d02-9acc-aeda0f394163',
  'fa20834b-e89d-4b9f-a499-adeb3885f727',
  '577b7cfc-1dee-4bf2-b1e7-11532a190fb3',
  '9857d18f-f9cd-4581-b9a7-06b90a7f1dc9',
  'de83f697-bc39-4fe4-8e4a-d17cccd75c34',
  'e0ea9e05-7f22-46fc-b0c5-2c4105ad8041',
  '49282da7-3a94-4bce-bb05-b6fcea94dcdf',
  '099d7e67-6bec-4ff1-8c23-a90d65332ec9',
  'f2ea3e4e-4faa-4b4b-b123-a32533e72781',
  'bd0b49c0-e85a-4f45-b914-3c5ba58f7e93',
  '33498b1e-6f87-4017-8c26-24f5476b1616',
  '9516a033-aa41-48b0-b71b-593879032f7f',
  '7def118b-14dc-484e-88f5-e5693e1239c9',
  'a0390afb-8a74-449a-ac7f-a82fee7d4eb3',
  '3cc9d932-84df-43b0-9e04-36a6d5ec59f6',
  '6ea99474-25f7-47d4-818a-a7c5d34fc5d4',
  '183ddd35-e9c3-4524-b72a-b180d68a6c81',
  'c8f63354-7506-4748-b407-ff917e7ca9cb',
  '482457e6-88fc-4c5f-add9-611b0e1cdd8f',
  '2d96ec6b-8e32-42ea-a9a3-92f76dff6445',
  '919a3065-dd00-45bf-8cea-097b7ab53fcd',
  '867c0ed3-8295-4363-b393-3021732cfdbd',
  '4e8420fd-2834-4a0b-814b-09196b3871c0',
  '5b5f6928-e5ae-4bc8-b0cb-f15608ee7300',
  '7c165272-be13-4f80-990c-8ea846d09de3',
  'af397eaa-76c7-4239-a3e5-8a6386d24f47',
  '80ebbc98-d94f-40eb-9d8d-fed8639a4cb2',
  'eefe7253-8a7a-46cc-b7d7-2db1eddd7608',
  '8af31d65-515d-4df6-be2b-a7a86ec0444e',
  '209dda95-d906-44ad-94cc-6692c938f1d9',
  '7648cef5-2906-4d34-ab20-9587191add93',
  '6a06734b-dd6a-4da1-a398-d68b026fa1f0',
  'f8586837-3771-40cb-ab96-111430e9fb43',
  '8f2af17b-b216-4ba5-bfaa-1ca1085100a5',
  'e00f99cb-60ac-4b29-b8b4-64b79f535a98',
  'f935376d-0795-4a2a-8ec8-e46e6f65ddae',
  '51d330e5-9be0-4e4b-9c26-e1987b9ce697',
  '30c0d717-a49b-464e-9566-297adb925606',
  '9d3c8518-07cd-4322-b47d-6b87d88c1cab',
  'ed25310a-7043-41b3-aabc-0d3eef173ccb',
  '2afe3850-6f34-4bfd-8ab2-9725c017bd7a',
  '43805113-3c11-481d-9395-50b7fce99bcd',
  '3f003a49-dfc4-4f49-a7e2-00cc7608cfba',
  '6894965a-9e54-4488-af54-fe9ae73b1b1f',
  '5b994456-a461-4f8f-9ecb-f4922a383788',
  '02d0140f-9cf5-46ee-8e00-894ff940075c'
 );

UPDATE medidores_list SET data = DATE '2026-08-10'
 WHERE id IN (
  '32dbc90e-7a1d-4998-b533-fc9acd348edb',
  'dc8f9e37-e9f5-4565-ac1f-b8f933362866'
 );

UPDATE medidores_list SET data = DATE '2026-08-11'
 WHERE id IN (
  '621ff226-b02a-4664-8f40-bd5e1d89243a',
  'a6232763-ae68-4e09-b0a7-ef6506aa8048',
  'd6f1962f-2572-45ad-9252-fb8ffe6b1abd',
  '30ff06e8-5aa2-4b98-a871-1203d936070a',
  '75439c74-96b2-406e-aaf1-790006c9f72e',
  'ddc47953-da25-465e-acf9-5938e287e7c8',
  '246abdac-d5e0-443d-ac9f-1b569dbac294',
  '88ca2a3e-5147-4b1a-bb75-3f8086d95b62',
  '021ac078-d8aa-48c0-8bf3-514c9a7ba69a'
 );

UPDATE medidores_list SET data = DATE '2026-08-12'
 WHERE id IN (
  'de9386b1-ba7f-4612-aec4-5f924d28ae73',
  '0450592b-1b78-4e6f-8ced-bc24a20efe52',
  '55b317f6-e334-4358-89cc-534153c396f8',
  '1f4224c8-c098-45f7-8661-065b70d34069',
  '7f2f4a08-beee-43ca-9980-61faad2e6421',
  '45f73be0-e346-41ab-b35b-68857f0c8c93',
  '4f70e2a9-c544-4d22-929d-6106ef0ede9f',
  'c367d974-11c9-47ca-9fef-bac5cade02a0',
  '98e4d377-7f0a-4731-b537-37ca65a5476a',
  '6a874ebb-506b-43ad-a6c9-95d8558e89ae',
  '9412e64b-6b21-4359-a2de-f631c253178d',
  '9797dee6-d8c6-4c09-b76c-36ca3510222c',
  '42603649-2951-475b-8575-39f304d45346',
  '7dddbfde-e066-4f0f-a16f-ba0eb9318302',
  'ed7c3476-2a83-40e3-964e-78d3793cc2e9',
  '698d4dc3-2762-4460-ad8d-d666044885e1',
  '162171a3-8ab9-4c46-a3e7-2b56ecf415f6',
  'a9bc385f-2753-45b6-895a-ad6834778ce2',
  'bec24667-4588-44be-81a9-cc9ecf754747',
  '4d8e6c1a-2a8a-4c6e-908a-1f7e4481d829',
  'ea1fc948-c8cd-4d80-bb2e-589db01db848',
  'e45ef725-4d34-48f0-9917-f8d07709b9e0',
  '7b3d10ca-391e-4a51-8f26-0418f343ef5a',
  '1bb6efc1-f0f4-4595-b1f6-7a7a14700ceb',
  '05149d33-7a72-492b-b48c-9d671fd3db9c',
  '4914e434-0cf6-489b-8dde-443a9dfea47c',
  '4b96b91f-fa96-4378-b40a-7e308316355c',
  '86ca2205-91d3-4b55-af39-439d967e0c39',
  '2eef7505-8f12-41f7-b462-bc835653973f',
  '57227135-77dc-4a25-9253-54fda0796164',
  '872dc559-a75d-40dd-bf29-dbad8b88609b',
  '15ab0db8-20c1-4e18-82cc-01bf92806eb3',
  'f7456fce-8be0-4b44-885a-de16edede3b5',
  'cebcef47-9a4c-443e-ad1d-6eaf21f0ca7d',
  'a1df5d7e-d86e-4268-b875-ac6295f094da',
  '975cfb28-db28-43de-a271-302a3f0caf67',
  'b9f4ae7d-00bd-4f71-90d6-8a738737260c',
  '996dc9a3-e3d4-49b1-a412-424c8ee0b5ff',
  '697191d7-89f4-4cb2-a3d1-ea4f11fe56d2',
  'f6efa2e9-b2a4-42d8-9e48-ea75b438e6c1',
  '1bdefdde-04e3-4913-a3bb-69c97a190320',
  '12092132-fce4-4834-b079-45a579521255',
  '9b4566c3-1c5a-4287-9413-8b69463d9e95',
  'fb9b248d-7867-4e77-be32-5faf26d28fbc',
  '7fbcb472-a550-49ff-8a02-3800d9f4172d',
  '1e6fdaa5-196d-41d8-9992-c9a173d5b253',
  '778c35a9-922a-492b-8c6d-4d8c9f2714cf',
  '01729ecb-c2e7-4f5f-bf24-836908426e97'
 );

UPDATE medidores_list SET data = DATE '2026-09-01'
 WHERE id IN (
  'ce40b423-cdc4-4107-8975-981d4abe3750',
  '8010f329-5bb2-4861-a469-11298bb892d0',
  '34bbeba5-fd4d-4b70-a1a1-08554ef34602',
  '0c129536-2c31-4e19-a67e-e1c7f5e7274a',
  'f5691790-70e3-4daf-9455-0a45d2de106f',
  '6b93e562-2b32-4cfa-8147-ad3f2666b60c',
  '70436522-dc90-47bd-a35a-d1e812764fe7',
  '0cf76942-d98b-49af-a317-f52352a3775e',
  '5459127d-fb08-42af-a092-2848a84479ba',
  '52c756e6-e40a-452f-8fed-a970aeb1ce84',
  '480b7691-40dc-4365-bba9-a9fef69d075b',
  'fded5dc3-c9fc-476a-b2f0-4300f4cce672',
  '03e9d96d-d0cc-4135-884d-2713919f043b',
  '206f0276-c045-4bcc-8192-2e0fb3cde4b9',
  'e6136abd-d36c-43e8-98a2-b87ebe5679df',
  '8c3d548a-f02c-4f0c-94fb-a840dae4f803',
  '0ba454d7-197b-4213-b87f-c062561009ed',
  '7a5f74ee-4193-4dae-97eb-389fe487b399',
  'ed97d52b-cb90-4d0c-82e0-13a294f8a663',
  '266750e3-82ea-4e0c-8f1e-b2f64ccc67e1',
  '52929818-7590-4540-b641-1a1f8db41552',
  '0a13c687-9a32-4182-a364-58e5a7999cb1',
  'd29ad428-d9d5-4976-97f9-fc2498a1304f',
  'cd1f9f52-5c20-4c1e-98a1-8ff4d3a6e6a3',
  'd85e96fe-7043-446d-acde-2fd81e22a687',
  '85b1279a-1ab2-477c-9cd0-47d032018dcb',
  'db9248d3-db68-4932-894e-46fd42bbe206',
  'cae3c93e-e64b-4910-8374-3e77dce94458',
  '1357fe64-fcbb-4611-aeb0-5702a91b2b04',
  '5e33cea1-f99c-4ee3-9465-64ea772585db',
  '6169ed52-f163-4ade-8e58-8e006428a81b',
  '718ee57e-2a96-4f1d-ae33-60f16e884351',
  'd689f9f4-5433-4a3e-a994-bd33c1dd290a',
  '8d41ef8d-3bc4-405a-befe-df49434db533',
  'd98aa5bf-7b2d-4df9-ac58-2227a02d1004',
  '7f89dcf9-94ea-4561-a98f-f198f8ad1206',
  '2bd7b38d-e37b-4dc5-a0e6-79af34a178da',
  '71a6978a-cfd4-4767-991f-01436397379e',
  'e084f4a8-7344-48fd-805f-7082b4650b4f',
  '38122457-33cf-4ccb-bc1b-2f15302a4750',
  '764de1fc-62ae-4c1a-b8e7-e8a5b57d7f61',
  '7964f10b-3acf-4931-b79c-9071aa5db016',
  'b7d33a54-8972-47b6-867c-f117968f572e',
  '85b4613f-3a0b-4006-9e92-50fe6b2e74db',
  'a876c63b-a834-444b-8e84-bb44a7fdab30',
  'acdf6c3b-1c39-4e27-9111-89eee211adb8',
  'ba0ef008-95ae-4a75-afa2-8226a28dd8b7',
  '4d3a5c02-7b08-4111-9c65-482c5c8f7e3e',
  'bce33425-228f-41ce-a96b-9b9791997934',
  '69d107e5-6b39-4dd2-bbc9-8ed6bb2ac0f4',
  '34e2f639-7783-47f3-b5b0-df9f2b1180c2',
  '2c91e0de-c331-4cbe-b93c-128ab1b2f15b',
  'f34e80ef-0cf1-4e04-84c0-62be2e1815dc'
 );

UPDATE medidores_list SET data = DATE '2026-09-02'
 WHERE id IN (
  '2a746e17-d4ca-4744-8bce-d5b7f8926150',
  '30ee09ba-6175-45b6-99cc-235d669f9c6d',
  '6f51d686-f36d-4360-919a-cc6f3563e51e',
  '2dd5bdbd-e29c-446d-96e0-ba90e011eb31',
  '4a30f7ba-fc49-4fc1-ab5e-be332017952d',
  '3d0ef368-7cd7-4c6b-b325-142093a47c9d',
  '44ec20f7-0a3f-4154-a036-82ddd29a9b58',
  '7b498662-874c-49b1-a0ae-c0ba38d92f91',
  'ce31c774-2e8d-415e-b230-ac373f82d43a',
  'df442396-e312-49d7-8ab9-4f258096bee5',
  '20cc738b-f980-4d4a-8940-e19bb3c3013f',
  '7afd81f3-c13b-4cbd-b464-3482fdecedf6',
  'e970482b-3256-42ee-97f4-ab64eabed709',
  '48ae13c8-2379-48e1-82b8-34ddcc2e003a',
  '6cb6ba12-caa9-43cc-b661-26d2a2089061',
  '6f43061d-1b56-4a9f-9a4d-53280aa4327d',
  'c5b1f937-3a87-444c-ad9f-f265c4c93ab0',
  'ba3a8028-5530-43bc-8f23-21ff0dc8fbb9',
  'e0ff1650-4536-42dc-a086-7c49dbbe08b2',
  '1e902ab6-2c00-43e8-9cd7-05571094c910',
  '25d8868a-1092-4489-95af-c07c1bf2134b',
  '970e3d5f-4988-433d-91a8-2b2b9f73fc6e',
  'c2dbfa0f-edea-4b7f-bb4c-301026527e38',
  '863ddd71-af05-4ff6-9566-ed0bdb857a59',
  '76d9ec58-0324-4359-bb7f-09ccd11f3ae8',
  'd9fa4716-89f1-4148-bbd4-dcd18594b99f',
  '28579e30-33dd-4ebc-9162-2324af293c4f',
  '440cadd7-360c-48c0-a54a-12a788187524',
  'a5e4e238-56a4-48b0-a04c-93566c21c3e4',
  '2dc3b6b5-7396-44ba-8e0b-45cd131c9fdd',
  '65ea8372-f258-4bce-b89f-c5516a851033',
  '35c96bc8-ec2f-48cc-a246-9151f7328d64',
  'bcb6da04-4ab4-4fdd-a75b-ec4a4d2b3aa8',
  '598911f4-91de-4eab-9d5c-366252bc47ee',
  '420f57fa-8151-41e5-ab5a-f80f9ad4e0bf',
  'f9cce875-2145-49de-8ebd-96d7a13f9ad7',
  'db15081f-f09b-4541-bc6e-e5e49193fb8c',
  '63b69ba6-7428-4964-9bbd-c39fb53f013a',
  '8913a720-5e9c-4ce5-9685-6404ea7f8054',
  '46f522ba-f50b-41f7-b4d0-dd30f7d273eb',
  '3fb13a9a-c7fb-4956-8c0b-6dd1da3049bf',
  '0b90a70f-76e6-41e1-b9f6-00524f4bee11',
  'a7438218-68fe-4374-8497-81f2d913437d',
  '8c95dd5d-884d-4826-9b9c-735294a58532',
  '099e4cc1-be3d-44de-b1e4-a17af75f48fb',
  '350c46a2-f39b-4c9c-bd93-4c66695e9f04',
  '1ab31943-3ffb-459d-a847-a07b6317c6b1',
  'ada114b6-48da-4f8e-b0db-28f22cb76303',
  'cb302419-fb40-4693-9fd2-3af9c6ffeba5',
  'bc973f36-fc85-45f5-8d2d-98a1c33ffe40',
  '066bb5ec-5c54-4d14-8fab-e8365a1a8357',
  'b1de7386-e189-41a5-ab5f-2684652c93e8',
  '9a299cec-fd6d-4ae2-aa46-dc55f16feb8d',
  '2f1fef54-3b06-4396-9ec4-850c59cb2f70',
  'f83a91c9-f35a-42ca-975c-ac8127a652a7',
  '2ba03553-2899-4819-b04d-c58233a2415a',
  'd9c9f4c3-86ea-42ac-934b-c5bf933c1ce7',
  '7f7a2c45-f50d-4ac3-b73f-12f4c22f09b3',
  'c3670366-160c-4565-8dd9-7d2a75f04e54',
  '3252aa3f-fa17-493e-b8d7-a32cfb1840b8',
  'e3cc3ca4-1376-422a-a006-a9149ffd975f',
  'b44115db-fd21-4e8b-a076-f53e2e5d67ab',
  '62cc5e4f-34c3-468e-8a66-a3d23ccc91bf',
  '5b74c346-1e4b-49f6-b4fb-d277f824e9c8',
  'ef6fdd8c-ba68-4c48-8fbe-57d8717caccd',
  '35645372-8cf8-45ef-b467-2320d64a40dc',
  '80b3c743-713c-4c75-b63d-71bc93869a74',
  'b263962a-51fb-41f3-99d3-c5f383d2e862',
  '0c266ec5-40dc-4a87-b9a1-dca0da955b16',
  '78a3b69f-03f6-4980-8fec-b349999f53dc',
  'b7044338-1f0a-4747-bfb5-235dd904c651',
  'a78ea6af-4bab-43d5-a98d-02dcda441137',
  '91896a6b-ff8f-45b6-ac5b-8799b99a596f',
  'f8a00cc8-5952-4443-9fb8-da45320a1352',
  'bb1800c0-e771-47a5-8b42-8baa334c5ee6',
  '41cea8f5-bb0e-49b1-97cb-b64923d493ad',
  'cc480084-b49e-453f-81d4-87a4f65e539c',
  'b4046a94-2685-44fe-ad6e-978893ff67e3',
  '70f696e5-c2c0-4a3f-934b-a2860b4adefc',
  '5b900ad4-fef9-4089-8c5a-cef0f629d0bd',
  '4beba8ea-d284-4880-93de-924c40721949',
  '2f6d2c65-ed5d-4406-91aa-9d76fca2bc5e',
  'ebff3c44-5593-4f08-bbd3-70683f72dc8c',
  'a864db97-e3f7-4a84-9ae9-2c4db826417f',
  'bcb2560a-e389-4fca-a2c4-c6d7d613debd',
  '2c633bb5-fd2f-4dd9-96bc-b5c46c0caacc',
  'b1471d31-0d6d-42df-9f0c-c823c656cde4',
  'f4fc3ac1-9416-499f-b3cb-4afe8c22d9a8',
  '3480f054-02a4-47d9-b9ca-d613ae254c5c',
  'ac70807a-1d5b-41fb-90d0-5660bc6a30a3',
  'c97a368e-ff72-4ce2-b151-43529b8a2dad',
  '3aa68d3c-95e5-4e1a-b58f-14f3b5352a8f',
  'd267ac6e-5acd-476a-b604-f63e9252a678',
  'dac420a6-1f6e-492a-b066-52e217228c78',
  '920b8de1-457e-46d6-a095-5928a4752ca6',
  '85552b7b-b2b0-40bd-a547-fd9ced13cde7',
  'e94ed024-f061-47b9-b806-342fbf632869',
  'fb59a069-9a34-4a66-805b-1e13c35538e7',
  'd4d7357e-463c-423c-9546-04350d5b80a4'
 );

UPDATE medidores_list SET data = DATE '2026-09-03'
 WHERE id IN (
  'f6767561-6663-45e5-b3c6-39237cf5783f',
  '36a7b2fe-e3b0-4249-99dd-4e1adc122ba6',
  '641b0eaa-936b-436e-a101-527f6c83c583',
  'bbc97da0-8a89-4347-b715-ab837b0d9afe',
  'e19a0f41-7874-4712-bc90-cc77e0be78ca',
  '12f8ddb1-90ec-4c38-a8c8-a324fddd3690',
  '9340bf4f-c363-4fd1-965e-1383d03672a5',
  '35419e9c-ef9e-445b-a542-3f5fdcdbb1ea',
  '487a911d-85aa-41e1-9180-92f8a61efeaa',
  '11a1024c-036f-48c3-8432-3be120df976d',
  'f8bfa210-1e1a-42ea-9151-fd674fd0a17b',
  'e24256d6-2343-40bd-9ba1-ec967e596720',
  '2b99937c-3366-44ab-8fe8-19de8ddc36e8',
  'bfaf9c17-ca07-4258-8175-c0de4977ab54',
  '6c19c9e0-2607-4662-85a3-fa9220f05a98',
  '983e4fe1-7dcd-437a-a2ea-1faba214f2bc',
  '4d8f0ade-4cd4-4719-9806-bbb84d2c0a57',
  '5a59f954-3b02-44ca-83a7-701034ed68be',
  'e89b4da5-7afc-4849-9500-b2c4e74e4de8',
  'c02b71c6-ea72-4b60-9cf0-da2c763653ec',
  'aa93aefc-a76d-4d18-af80-4590c48ac34a',
  '29a1453a-58e2-4e8c-8956-c1d648fd5bda',
  'f90ad6ee-8a6a-4597-8627-9daff4942c96',
  'b0cf499b-911a-4643-9682-ac6031060480',
  '5b4a69fb-c718-49ba-b057-8433be2fb85f',
  'a21d24ed-2517-4a9f-a033-98c0b210a39e',
  '10700f0f-2933-48d0-ae46-6bc1941c258f',
  'cf2ad127-6ef9-4529-93bc-3d7122917aac',
  'd2b18514-f249-4ae1-bb87-c4d3e2d1bb25',
  'dde70d86-efeb-4385-8658-63965faf945e',
  '53c5323b-e06c-4eee-bc74-fb80623df95c',
  '03cc014c-16b1-4f34-995a-ae42cf2b924a',
  '8d236fe8-5049-4d89-b550-7f3861bf46d5',
  '2b3b40f6-f617-496c-8a61-4b4fb58a6a31',
  '657643f2-40a7-4705-b706-6f6afc3c5687',
  'dc263c2a-d71a-4f3f-b9ef-74ca172ef9f8',
  'd6451161-594d-4584-bd45-63979b0665c6',
  'a227869d-7be7-4f97-a7d4-539173ef4262',
  '1aab334b-245a-4e35-8c00-cf344033ed8f',
  '7ab98b09-c521-4680-a1ab-f968c00c37de',
  'c82a6d37-658d-40a0-95ab-de8abbc8f265',
  '86e416f5-848c-4ab2-a6c9-fbb0ab2bfded',
  '3f6da343-1f02-4d93-88a1-72d6fa96cbcb',
  'e2c8e003-8a24-48da-9998-60aaa3f2e74b',
  '8e61fdfd-3199-4faa-a526-bb43c134ea7c',
  'fc2995d9-5479-40d6-a9c9-ec80f51f53d9',
  'c50f9613-9740-4bc7-9806-377ceeb8972e',
  '041ce65b-edff-4757-9a90-5245e4ccaa06',
  'b328a9e8-2887-4b05-b41e-0484a7fd04bb',
  '6b9576f0-b8eb-4497-a5a5-7e49b10d2f1e',
  '81e851ae-a824-4270-867e-6485aa42f7e7',
  '5f5a90f8-c388-400b-b429-d9bfcf7a981e',
  'e002421c-e3da-4725-b3e8-3c69510bc03f',
  '4d3a8c88-e784-4d80-9788-d33fcbec1d41',
  'edaec81a-229d-480b-bdb9-655d06c622db',
  'c5301350-6f33-492c-85d2-fc09d9c668c2',
  '89d03ee6-511c-42e1-abef-98fc08469c89',
  '85b60415-bad0-492b-94ee-7066080abc0f',
  'cd574518-7698-491e-940d-7a996c9f16de',
  '0f3b3414-b287-4030-9049-9e85f71967ce',
  '21d44912-cab6-4d51-b1e9-862d10eb889e',
  'e2dbd7c3-6b9f-412c-bf35-b73660f91f13',
  'bb97872c-cbf1-4e07-8623-361690da22ca',
  'd5a44fc6-c9db-4800-b6bd-fdc658a528d6',
  '462674d5-a8b0-495e-91c5-5b04828f2ee3',
  '47880af1-ae6e-4c96-b466-ecdcd7a175d7',
  '09da7f2b-6040-4645-bc27-51f2757287b3',
  '839d59da-4715-4ed0-b40d-7530de86f380',
  'a0b3537c-d73a-4727-87b2-fd6059c82f2f',
  '646042a7-86d3-4467-8625-b351a5cf0ca5',
  'e6453e7b-7241-4f0d-a466-1edd2efa9382',
  '2cb524bd-6b4d-4d7f-9d89-d4a41cdbf21e',
  '42e8e8a1-150d-461b-b320-54b166e7f090',
  '103e713a-0478-4fa8-9b9b-5db55643ea91',
  'eba6a6d3-f24b-4461-b0d2-ff0eee8baf52',
  'b845dabc-14c6-48ad-b7b0-9fcf3890e9e1',
  '4cc7e30e-0198-4b28-bb02-710b6e6b0d20',
  'd1e54662-5fd6-4990-aa03-df2b42e61939',
  '12cc174a-d782-4c4f-b51a-16b497264bb2',
  '0179f82d-c56c-4d4b-b84a-f13bf6d8144e',
  '71bf3d72-7919-4bb9-855f-095c4c94eaef',
  '4a33163f-b12b-430b-b5fc-a21154e2cef8',
  '8d50dc67-4ae1-4373-a4b7-c0ff0b5af8a4'
 );

UPDATE medidores_list SET data = DATE '2026-09-04'
 WHERE id IN (
  '5c9d4bc0-16cd-4ca4-8f6e-768744343dd3',
  '6eb2b05d-1076-4928-8196-5bbf7ecce169',
  '691e1637-21f7-4c93-b26b-c61881cd1303',
  '921352f5-2cde-4fdb-b367-82e899e7d8ab',
  'df38c11c-7195-488b-b97b-e68fe0e20329',
  'a7c73c53-f7d6-4782-94db-c552085c6ead',
  '0f56fb01-b0dc-47a8-a7f9-cfe3480e3570',
  'cf8a7bf2-cdb1-440c-8588-7332ebea101a',
  'd2ef652f-fd51-40cf-9cd4-09e123278fd5',
  'c581c2dc-5e42-4524-8140-309b32aeef4a',
  'a4d81011-8363-4cda-a806-c5f9fe4d7cf6',
  '1c7cb490-6169-4f1a-8678-9cd41ef4be19',
  '0c633933-0eb6-48c9-b48d-56b4340c656f',
  '49f93c06-56ac-4e95-9156-dd12eee70247',
  '93df8ba5-e4cf-4df3-9b5b-c061ac653ed2',
  '673ba1eb-4e15-4d31-82c5-b93835bbb649',
  '92c98555-a962-40aa-a4c6-ab3a4083f90b',
  '2eefedec-a86d-4411-a21e-e2ad69f14da4',
  '0dd40bbd-3d2d-46e5-8303-1bb9e116dd59',
  '1e7f0b18-d01d-4062-9329-49541ff3fccd',
  '3c59b30b-9e57-4ad7-8c23-9f5104d779c4',
  '791e0d81-486e-4467-8af5-f37f4605e1bd',
  'b9034a4f-b020-4fe5-91f8-2d4d311697e1',
  'e867c66e-3b84-491a-94ab-811b0dd9b5ea',
  'ffdbd100-d0b5-469e-8df6-d6c26a05d92e',
  'aed1256d-5458-4fd5-ae56-c4fc69edd7f9',
  '1b79739c-3c89-47d6-944f-badb7eb279f6',
  'b0a3b7be-c1cd-4a7f-a732-00ddd9242146',
  '7c83119e-26d2-4884-9c97-ca7bb7408bb4',
  'f6e3fea4-0586-4a01-adb4-723e38fe799d',
  '0b8fc38a-b6d5-4b52-8387-f68e85ac7945',
  '9c8752f2-ac21-4f7b-84fb-2fb6517b83d0',
  '2bc8a6f7-42e5-488f-9af9-2d7df99f059d',
  'c3ca35f1-12de-40c2-91d3-174691806273',
  'd6dde776-edd5-423e-beab-5539d404ea7f',
  '16978518-2727-4e68-8c57-cf93db51c283',
  'e0e12b4a-21f2-4c9b-9e5e-9d59a077a06d',
  '226b6763-7375-40df-bcfd-7d7b56f41e29',
  'bca82ca6-1af2-4688-813f-9a89557bd8d6',
  '11a8e50b-3dd2-4157-9ef8-45ad4984670b',
  'b453cf55-6af8-439a-a537-37ef545c0c3c',
  '1a924363-9975-4dda-b1ce-1bfa01d0633c',
  '7ec41234-2bc4-4340-8269-dacc3373e4c1',
  '4a51a781-ca78-4aa2-9f1d-49aa5c6ccd13',
  '29a45377-53bb-4501-ae45-7fb017f20250',
  '26a76dec-ddf0-4846-8754-a84390433b97',
  '244933c3-400d-493f-ad98-44a4e15e6803',
  'db558d99-37ea-495f-b038-01e6937d96e2',
  '216a0510-51d1-496d-8935-ff0acb3bf0d1',
  '0f4e5cde-79de-47fd-8a72-a4f0da759724',
  '17b5c0df-be04-4129-a443-d2a38a69aaa3',
  '0f2bddc2-de85-4408-86fe-b089dc7d8d3e',
  '8e8b846f-d95f-4ee2-b006-d6409cd8f14d',
  '6d1b3cda-7876-4931-8f0c-3fd714b66a59',
  '04ec92df-89a7-4386-b1fc-ce8106c2a319',
  'ef729b18-68f6-41d9-959d-be76eed84763',
  '693413a3-de20-41e9-8616-a3a5fcdd56f5',
  'edfebc80-e2fb-4448-9ac6-add4b831fe17',
  'a0d95a51-9f5f-4cbf-b0d2-16f61d2bbde2',
  '2ca331d9-d496-4002-afd1-8dca599b1cb3',
  '81185f1a-e388-4175-bd21-b8e1d99ae1a2',
  '462e7359-2d3e-4a5e-865a-229927ab211b',
  '877802a4-4735-4071-938d-ec28f20426f8',
  '8adb3ecb-8f64-4e86-a3e5-017da4628254',
  '752f3591-62c5-4b5b-9221-8502cd819c1b',
  '97ab4076-cf03-47bb-8fe7-a72dd42ca5a4',
  '2ed455f5-de53-4cca-85ac-7377c722c220',
  '5a3cea3c-215d-4cda-b424-ad66a42e49a1',
  'c01345bb-1442-4fca-9058-066bfc052f93',
  '1ec774df-d855-455f-993e-8cd27ca8a6fc',
  'f8808c12-4e2f-4d0f-800c-90a10ba45ce7',
  '2d471f5b-393d-4696-ac71-d88cb662ac01',
  '63dfc88a-f8e4-407a-b3fb-d7421c851c1f',
  'a183a28d-ac81-4c85-bab6-e5d6bdb9d993',
  '5ff9a597-7a44-48e9-8fda-62cdfc130fbf',
  '612f98d7-a183-4419-8cda-3edb8c8f78e6',
  '338f55b6-78a2-491b-b527-50713aae146b',
  'ba1142b5-0b65-4004-8eb3-3081d0c9f51e',
  '88a79806-a4fd-484f-acf9-9062ad3dff41',
  'a2370f69-0d41-4a09-80a0-943a5d782098',
  '9cade213-c1c0-485d-9261-38abf5c44027',
  '59392d29-094c-45a9-8f9e-69e7ad08ef6d',
  '914f1605-f784-4d60-b0cc-02c1f3a10753',
  '1b241dae-780d-421a-acc6-00ed37245959',
  '109641d0-6f5c-45a8-a16d-fb0f4c31aade',
  '9d28f783-b970-49c9-bb68-45d8bb039996',
  '100dfddd-3d50-4194-b469-4d92e9eb27ff',
  '9439e412-c4cc-477e-94ca-27d225c11d91',
  '495741b5-5cad-49a9-baa8-6e106d5fabb3',
  'bc4ae7c0-b394-413f-89a0-3cdc3748a0ed'
 );

UPDATE medidores_list SET data = DATE '2026-09-08'
 WHERE id IN (
  '4193c077-a7c9-487f-a106-3b603ff6836e',
  '45158ecf-a599-4d30-9be5-6572f61277a1',
  '2448999a-d6a1-452d-9616-ddf4e2e70521',
  '5739842f-7fce-408a-8abc-5b27d79a749c',
  '1763e5f2-544c-4792-89c7-7e0070460be9',
  '83e243e7-ea07-4b8b-bf12-fb38ab16c266',
  '168cbdf0-4b6e-4217-afc5-c1aabc059a69',
  'df18a25a-8035-41ff-99b0-de5923721369',
  '46c7e390-0ce0-444a-ae59-b6c303ec0107',
  'cde51540-0d17-4675-902e-10d21820bed6',
  '7b3c29dd-ccb6-4e80-a3f2-1017f69c529c',
  '86a1c416-cb29-4c5e-95e4-17b61cd69601',
  '99f30a2d-2fc3-4cbb-bad0-b384b7a5672d',
  '5a0b5264-effe-4431-b22d-c80ba43cb6bf',
  'e9cac2ff-2dc7-4e64-916d-419cda2150cf',
  '99609211-5a30-4e7a-a2ea-bee862ee4745',
  'b9d5c933-e78f-489e-8b55-e1587f3fc211',
  '88068508-44cd-454f-b715-89a11cf435fd',
  '9bdbd321-4398-4adc-8a60-86fa10dc86a4',
  '6cb1a96f-3459-4a45-9ecf-4952c3c0e543',
  '74c5debc-5a4f-4057-903c-d3fa61c0ea30',
  'ec03333c-c2db-4dae-a377-9b82bff47e62',
  '9a8471bd-0fb1-4824-8388-4bc24d6c9ec3',
  '607fcf84-a9e6-43d0-b3dd-627fe5e6b4e1',
  'e7a8bb98-6c39-47f1-9d18-4794c22080b8',
  '6e566308-049f-43b0-8b15-93f2420f8352',
  '8750315d-927a-4f93-9e7e-4cde1f4986cb',
  '607736f7-b4ed-4d16-b8fe-e4f723b9aa75',
  'b7cc3517-809d-4e0a-9cd7-89611db46629',
  '678758bd-e56d-4347-9d33-84224d96b024',
  '14f6938d-c102-43d8-b75e-f6f56962522e',
  'c1dbd50c-e1b4-485b-bdb3-a71ad2d88214',
  'a7632552-89e9-40a3-bc31-46cc5c373d82',
  '7d82fa7e-5af6-4b10-80c2-09a330178ef5',
  'cb90dc30-8cb0-4e73-bf6c-68d165ff9f68',
  '6526358a-fd84-4bf3-818e-184793beb6d6',
  '40ddf895-e8c1-4226-84c5-30d9b21d110a',
  '3c2333ac-441c-40fe-89f9-5c154a3e51d0',
  '41bbea24-7c0f-4edb-9c19-0c2835fde1b4',
  'd6be90e4-9ccd-4f19-935a-820554e279ed',
  '40e864ae-d882-488f-a303-9724b3248498',
  'a64747b3-b1a9-4b55-8228-214f2d76b46e',
  '8f87ea46-d75a-4bd5-82a5-564753de89a1',
  '82384439-d0da-49a4-ba15-b24810d6509b',
  'efb107bd-d3bc-4d9d-9df2-e0ac8a5fb036',
  '34e5ddf8-5776-47bc-bde6-e4821f9f2ce5',
  'b5a38bcb-f7aa-4dd6-b3ea-b81010dbd57d',
  'bb45f1b6-0bed-4145-8451-3df29e7d6ae6',
  '642020be-9931-4e6b-99c0-094680c2acc0',
  '6fed9078-31b5-482c-bf72-0a81589f4e6d',
  'bb35a836-95fb-430c-985d-1b7eecd17b03',
  '0c9b69ca-8b96-45ea-a5d7-60517752dbab',
  '2b76bc8f-be98-410a-9710-255c46816256',
  'e6e11f12-f4f1-4575-8925-cc1aeb58b8f1',
  '15251bb1-b699-4184-a80b-d984a13c3ffd',
  '22982675-c715-4a5d-bd43-20e5f52bace9',
  '5261d191-383d-4e88-9d3d-dbe2ebf9c2e5',
  'f68df9d2-e6b5-439e-af4c-af9fa486d185',
  '9d8572ba-5603-4047-9dd0-6ca771105134',
  'ff397543-6e48-473a-bc9a-4d1beed0aab8',
  '23b75d9b-ebde-439a-a354-024b47ed74cb',
  '1df2fa76-2a74-4db2-bb13-18e263227f8a',
  'c4f3aa7d-e1c8-4a6c-a4b5-91dbd938c488',
  '6849d527-a35d-4e16-aa98-a23a909f2c75',
  'fa1db76f-e2af-41f8-809e-22b8f43e0f52',
  'af013c91-b5ed-49d8-92e9-e87e6d75ab06',
  '8c26bdb6-3923-49ae-b48b-23615af718b4',
  'e36774bd-43d0-4c48-9800-0a15b1e7197b',
  'fc6539f9-88a5-46cd-95c1-2a1cc5b31e5e',
  'cb0982db-c759-4390-91a2-bdbe05d6cd6e',
  '4e146176-95d7-4caa-9aef-62177f28320f',
  '6b5e3141-51ff-4332-b7be-8194437b1bd3',
  '4d079438-8fa2-459a-ae34-09eed2e35911',
  '0939b469-9c79-46f1-a13c-d37a108d3f5b',
  '8f7713d0-1ea0-4a16-8bc1-dd81a56aa419',
  'cb418590-db18-433b-a019-d1eff6a44e50',
  '9ab451b9-fd9d-49a9-a6d1-2e1351edb80a',
  '5a8ad938-bcae-4605-a27d-45bbb41c17b6',
  '25f7c952-7fb9-4035-ac61-eff8a4724f56',
  '54671b5c-dd82-4736-ab59-944b0ae040d1',
  'c29509a6-a656-4dd8-a551-10ed457731b2',
  '0fbdafd6-cf19-433f-8d1e-7aa358544281',
  '8a9aa4a1-2a65-44b3-873b-9df96bbe1379',
  'fa003604-2871-445b-a8ce-e450175ddd1b',
  'b9af05ed-20ff-4225-8283-f5fbd1dc70fd',
  '7b14c2dd-e9b4-4497-88af-0a9f1855c495',
  'f4baa584-3351-4540-a05b-1c5c50ed05c6',
  '61820e8e-c848-44ae-83c6-09e900521f7b',
  'bd5dcdd0-bb92-408a-8177-83898aff0996',
  '35920925-d5a1-4bd9-8515-a7e8b2e2c0bc',
  '5f01d057-0c7b-47f4-9182-0e6a43867ace',
  '5e63479c-1f6b-4d73-b22f-98263a5daf03',
  '2a9f5613-132e-4337-b0a1-70a3cc921dd9',
  '7cdc842e-9120-47f2-bd22-4f82141da1b6',
  'fdf8be7b-4bcd-4b31-aa0b-d30a19af3f3e',
  '68b27550-6b0e-497a-b7d9-de3988faab2e',
  'f36af3ec-8cab-487d-93e9-f4d2e947b1ee',
  'd6bbb766-fa38-418a-8051-d5a00cb9dc50',
  '200d711f-ad28-41b4-994f-75d09195d8bf',
  'a90dc4e6-a0b8-4050-8452-3aac65767100',
  '1e9731cd-6ca4-4033-b53c-6fd1b28a4285',
  'e9fc7336-95f8-4e54-826c-cf5ca56b62e1',
  '9e472628-518a-4392-b01e-a737e67a79b3',
  '2ba06c9a-77cc-4eea-bd10-6961f9719008',
  'da17675d-1775-49c1-92de-950fdae37fd5',
  'f14fad71-5995-44ba-839b-e6c9a947fb1e',
  'a5ddd950-1f8d-4d39-9990-39a8adc7fec7',
  '4de6c5b3-3bfb-4cef-ae63-0ab6054049f0',
  '9067dc3d-596b-438a-9fb9-74fbb64b465b',
  '66dab0ac-8a3b-4dfe-9a2e-a96998388614',
  'db678c22-4d92-42cc-a230-bf6c2fd1c7e2'
 );

UPDATE medidores_list SET data = DATE '2026-09-09'
 WHERE id IN (
  'b8f69504-0736-496e-8be4-c6ec06f5e24b',
  '9d029521-af50-4299-94e1-9898c96828c6',
  'ef046371-4f45-4a0d-856e-f43c732dbe9f',
  'f9105eb1-7fa8-425d-8322-81a6b75ea4ed',
  'dae57400-6736-41f7-9d04-d4e89c0674d0',
  '1297199d-9559-4209-9942-ebb3d51b1112',
  '63ade22e-1047-49e7-b754-f21528fb0fdf',
  '68aa41ef-825e-4889-9ecb-a69eb83d01c3',
  '7120cf04-6975-451d-876b-fddb8acd6738',
  '698701cb-85b4-41de-8e33-5648b85d028a',
  '197608d8-4e4a-49b7-a934-82292e064ab1',
  'ed8dc983-123f-46ef-8173-3da297b196ec',
  'be05f262-d31b-4ed7-96a8-5e7b05e8ce55',
  '6e3ef2c7-63de-49f4-9f08-4a0ab56dda5a',
  '473c0877-f89e-4c6f-aacf-bcb957e38d70',
  '818921d6-ca32-40c4-9e3f-109ecf3576ac',
  '6efccd30-0cb9-4bb3-a0ce-3734b75e45a5',
  '213259e5-05fd-402c-b2d2-07920fc69f75',
  'abfe6453-02ef-45f0-8a1c-47746f94e7f6',
  '1a8060fb-fcb2-48a4-b18b-817fa564aec6',
  '60225acd-1c82-46ee-bc15-2bf055696ddf',
  '5b7e61f0-b2b5-45da-b815-a23060456b3b',
  '1d1e6362-c994-4176-807d-832de8dc8583',
  '9518fb06-a44e-49bc-96c8-426df9a1c763',
  '23e1d051-1e96-4d7c-96dd-e7ea4f4e5079',
  'e8c30e3a-1807-4c96-a46d-0756821275bf',
  '9eee4847-3c87-47c9-8267-48673558046b',
  '8c13288d-301a-420b-ba9d-6171a1899474',
  '47ff66bd-4a5e-4883-bf02-2ee7daa56528',
  'f371ecc7-e331-49b6-8fe2-1944275dfd9e',
  'b944a29d-e6ce-4077-88b4-8ac613bc70ed',
  '63f69c72-ff25-486e-a7a6-bda3c328efee',
  '63f65ef9-c310-47ae-8d8e-883c45336067',
  '508c67d3-8dc4-4603-9c06-e6d3961968e1',
  'ef8d0e04-491e-4575-9281-f956f74b3cdb',
  '165252cc-e219-41f6-9cb6-8ef38f7449b3',
  'a38443c3-c0b0-4e2c-a0d4-b6034bf7c477',
  'e6242cb0-e8e2-4b77-b467-a45fdef2a2ce',
  'e43b4037-50d3-4647-a147-57651cabb597',
  'd6fe641a-5ffb-4fc6-91fc-ea3fa0316dd4',
  '84ad4baf-fdd9-42ac-85b4-018358882f7b',
  'a44143be-b993-4912-98dc-483b1b3893a7',
  '083a3f4b-0daa-49d4-a5d0-224627a3b5dd',
  'fd356dd8-f2eb-41d8-b09e-93749cfd11b7',
  '32dd0c67-2ec8-4285-959b-64e04738acbd',
  '481dba1e-0633-4a4d-bdf6-dc9e876384be',
  'a4cc00fb-5df5-436d-848c-ccc78eac2398',
  '260c1fd4-9d7d-41fd-8ceb-3a56fa548f1d',
  '71af4353-9602-4b99-a8e2-86c7e6e2e7ee',
  'a1f0bf22-1154-4254-a661-f8ab88f0e6c4',
  '2f1e4cb7-6a75-419c-aa6a-48156202e797',
  '4be1ba51-7e2b-4edb-a03f-ae66aad3fd75',
  '39c21e95-3d04-4896-b9cb-c26ae124dfdd',
  '59c85aca-ab7e-45c4-ba90-17692ac9c599',
  '021e2f3b-7599-4f46-aa24-859ac541b998',
  'ef93b815-e9af-4c54-8eac-40e34f317719',
  '89fad77c-bd07-438c-9d1e-ba834b8afce6',
  '708bf41d-feb6-45f6-8d8c-b354635acbc8',
  'e32f4a10-86b9-426e-978b-87160207d5ee',
  '4ea64564-a84d-4eb9-bffe-03b7413e70da',
  '7a3a5900-8b57-4660-ba07-273ef119d5a3',
  '77b09101-b6d0-445d-af1b-71621711b7a7',
  '78481838-93b6-42ae-9e73-65689906a655',
  '866bad10-349e-4fae-b640-ba08637497a0',
  'c9206be5-7702-4569-bffc-27f18b2bd048',
  'ea454d27-4d68-4bb0-a13f-eafaffb6e405',
  '6537276d-e539-46ce-9e4c-366b323bcfc9',
  '025c7da4-b816-4751-b5f0-347b0922249d',
  '2bc38932-510b-4947-abf9-ec1b23439fc8',
  '50c5808c-e8eb-4ea9-b86d-5663873aff18',
  '98faa473-60c3-4da3-a117-cde834d47c7d',
  'f829b4b2-b77d-4c58-af21-6a067c25467d',
  '2a676216-eed2-4bbd-ae1c-eae1a8a4719e',
  '591f3f3c-770b-4bb4-8c88-1e4bca92abcd',
  '3b98251a-2617-42c9-b264-32e2eebe44a1',
  '1538101e-4723-4525-a1a4-373b4b77dcd9',
  'b5dd9667-2076-4710-88f4-d33a0fb63a84',
  '54849517-9faf-4c87-a371-6f2205944a02',
  'd2efcb3d-3074-4e1d-a837-69495d30f0dd',
  '32c06ece-c8e4-4856-817c-ee7082f45abd',
  'c4e97546-ff04-415c-8816-fdeda28ec965',
  '630731f3-14ec-48b4-a222-7c1d3459b33b',
  'e5e07b32-1d93-4203-98a3-812aa5d1dc55',
  '30c7f24d-d574-495c-859d-b5f2fd26882e',
  'ddaf30bc-aa5d-43d6-9fdc-ae2134c5d9bd',
  'c15bca92-b344-4799-b607-430335734539',
  '9bc00221-806c-4df0-8146-addcaa3e5238',
  '3fae0abc-ff5a-472a-b2b0-a01bba5da1a3',
  '346ecd2d-4ee0-4004-ac20-8d77e7d5ff4e',
  '9693e65d-f838-4bc8-89fa-a806039db5a0',
  'df460400-6fb0-481d-9545-b3b89a656076',
  'f31431c1-dd63-46fc-9969-449c567f955c',
  'e154a7ae-9f2f-45c4-bc07-0623456be2b9',
  'f36f5eb1-3cc3-4717-ba4e-8a2395d73725',
  '89592915-a283-4b1f-818b-cbd82be62812',
  '0cfe7e3f-cbdf-4793-8221-26f62654df2f',
  '09c80dcb-619d-4564-9037-acee2fd9fd3c',
  '4b5bde7b-e41e-4fc1-970c-d9ede2b28654',
  'd1543eb2-1cea-46b5-aa72-ee6d2e7e4699',
  '19ca7a60-00f5-41a1-9ba5-4f809a15c7be',
  'd24bcfa5-46cc-4a25-a0ff-064886adeef1',
  'd2dd1528-7a10-416d-80bd-d21cc32e1e52',
  'ca79946e-6ad7-45be-965d-e3338a3be81d',
  '89ea797e-c2a1-431b-ae7f-bb22dc2019d2',
  '292ab2b4-67cf-4933-9635-12eff556d46c'
 );

UPDATE medidores_list SET data = DATE '2026-09-10'
 WHERE id IN (
  'c18e91f1-21bc-4468-9962-90eac0c0f513',
  '4b414f90-b480-425a-a29e-e9ae09c1e152',
  '3c52b05a-15a1-45e8-b830-36181148c1cb',
  'acbeb1c3-5508-4f81-a204-4129d6f476d1',
  '9cf253d9-f6c1-4561-a30e-32d01dc8da61',
  'b437c612-80bd-4762-ad8b-0b8f1ffda064',
  '748d212a-f9d6-49da-b20c-35294daf7588',
  'f683cee3-6684-44c1-8037-922e988b6776',
  '6d8e5688-a0f8-40e1-b925-78a57e06de5d',
  'ca9521b8-504e-4633-b05e-8d473feae8cf',
  'cfea7b4f-200a-42d5-ac9f-275b908a990e',
  'f0045850-2644-48ae-b487-bfef6ad9b8a1',
  'a35e164f-3e4e-4594-a486-c66211fa9b1a',
  'a9881eac-840e-4d2d-b56b-d6195de777aa',
  '43c08641-5e51-45c4-870d-7b34fcc284fe',
  '002ed238-2c60-4663-882c-59a1d4b098c3',
  '8b24594e-a31a-4594-88ae-a2089f44583f',
  'd35cdcef-c749-4607-9039-ba4a3ce6db86',
  'f2beba2e-792e-42dd-80c2-066161b38fc2',
  '8e073499-516f-45d1-a09f-5654dd759759',
  '7d31dc91-9e72-4d4e-b3fb-b6bb3e1172cb',
  '97db0452-dfb0-4eb3-bcfe-fa2ca4436063',
  '13500f02-b8d2-461f-b61d-ac39082a2b61',
  '0b3adb83-2095-4064-be97-f617bcc8d917',
  '48c01fb0-594e-4589-aa52-c7ae21e88867',
  'f10768ec-9b40-48b5-b05b-8e1e7fbbb668',
  '9d3e0b52-3d80-4800-8e52-ba93eae07ac7',
  '01043b46-fc5d-46f6-9bfa-f6a5372bb17c',
  'b2a97548-9885-43ad-b8ec-c75e6bfc94bf',
  '80e95ce3-e455-4fe7-8e3f-05caf1100414',
  '5769e45e-064f-4b09-aebf-af907f931b5f',
  '31007fc8-e811-4921-a181-561211a12a4d',
  'de309c54-b3d2-4e9c-a46d-5d31259a5bd0',
  'f8da6368-c9be-48c3-bcf1-82ab4d383e28',
  '64569af1-2d80-4d2e-b140-083f71851d9b',
  '6c4b7058-0daa-4d53-9539-30fe7c7079f7',
  '7c025f83-382a-4478-82db-0aaf5c147574',
  'c6f0b8f9-707f-4c4a-a1b0-1c210a121111',
  'e5ee27e4-641c-4533-9b55-1acd69bfc515',
  'b0e18a16-be69-42c9-8bb8-e9de0e191838',
  'f8d8aa9b-8776-46cd-a14d-7ec829d4de28',
  '9795f937-625a-4a5e-93ca-5812082475ee',
  '8824ac4e-fb62-4018-9c28-4a9d725c001a',
  '61a4a571-3882-4a0a-8d8e-852478f96516',
  '83e3873e-7285-407f-86e9-43c611dab74a',
  'e1273d16-07ee-4282-8f19-411d40067b92',
  'cb40a0de-fb61-4c6b-8bd4-5628a926a6c1',
  '5598a411-2761-43b9-bc71-a82393710e94',
  '57dba0a3-5599-45e6-a365-811e026d17bd',
  '14e80386-13b2-4492-aa2f-6b573a3693b9',
  '9ed7a381-3467-4792-bd88-2803bdf41de1',
  '4b840831-fc64-4f19-93f6-5124f69fa64e',
  'f8d7882c-1ac9-4c38-9ce4-ca16ed348e18',
  '7c699fdf-85ae-4423-8f3a-c01902d91b66',
  '00401730-1633-491b-9e71-d7f88166b9cd',
  '8a07acd9-85ad-40b0-9f83-06e06d9966a1',
  'ee9b9470-eec2-41dc-9112-d9b5e31643f4',
  'f0710af6-9dc4-4d2d-bbc2-990179d5446b',
  '08602f65-9b74-467f-b3e5-256dad2a2dcd',
  '3a95731d-8b03-4c9e-a6f4-9daa6dfc2720',
  '54d9fe6f-3f27-477e-b1cc-c775924a4724',
  'b52f5395-bba7-4044-87f7-402e28cf590d',
  'ffc7c3f2-9e30-4ec0-ba67-b98106ca6861',
  '8bdb253b-6988-4f16-8644-a03c6a281d8f',
  '6fd5c5c5-395b-4198-b7bc-17e595d29f16',
  '57a5d95b-018d-4a62-aa5b-122eda7b0281',
  '43d5e91e-77ca-440c-bbc5-5104b0a0fe35',
  '6365ee3c-4114-4906-a288-43de0e4e5709',
  '7ada8b3c-b91f-42f4-8941-2bebf7714821',
  '1ba9ef50-03e3-4afb-8593-c9cf0065f1bd',
  'f35c820c-d7ec-4a12-9f4b-ef379994f9d1',
  'e6929f49-0e20-43f9-8c12-3b66cb35b557',
  '2c5b88cf-eda3-4e7b-82d0-695e88990096',
  '025ea1cc-4c12-44c2-9a54-3cb1ee017482',
  'a396bb29-2ab2-4ed0-b073-57a0b061b004',
  'ea668ad7-7582-47fd-abab-fd49746ae402',
  'b3c8ed31-205c-4ea9-a32a-b915c3c58345',
  'ee60330f-d4bc-4492-b164-cbe0f0e8bf8c',
  '538144ea-e98c-4293-bb95-965b2a75623f',
  '668e3ff4-4d0b-4b46-b438-84f9090540ee',
  'f0df01b1-b30e-4695-91d0-bdf91cfe5868',
  'c6eb76de-dee4-4f59-9b3e-a6890c716824',
  '2caa1226-6745-4ede-977b-b9278abe26ea',
  '82ee6346-f055-4cb9-9439-a57f09e1ec03',
  '1315bb36-359b-486a-a480-9a7a81b38160',
  '3afd407c-5533-4251-9cbb-9df7a150059d',
  '48944f47-fd6c-4003-9bfc-24e636712845',
  '687906cb-1717-4298-91c9-b90f6534a9ca',
  '3ff132b1-e620-41ad-abc5-fd216f6f1682',
  '1e3ae545-0674-4547-bd4b-d59869da475c',
  '60086ed0-f253-4246-8931-a471703f1d05',
  '144a2946-bb2e-424a-964a-cab9fea2a92b',
  '28b5cb97-05a9-421e-8931-99b159c1e69e',
  '1469ba61-0270-45e9-9c77-b171562f6de9',
  '2e8dc897-da9f-433c-8bdf-75f35f1e3198',
  '98e19faf-3cfc-44f6-a11a-d5c63458af8b',
  '6d38e44e-3c47-42b2-9d45-1266e688cb60',
  '7acd7abc-a03d-4721-8b56-4a3841aeea24',
  '41b8b201-fc86-4b58-8011-18bb4a33b138',
  'd599bcfb-ac1a-40fa-a9cf-29de948d9f77',
  '1b72e19a-488b-4e20-88ec-e28232cc3d01',
  'da2be0b5-feee-4719-83a9-a74b92cfa467',
  '32fa617a-ce39-44af-a274-3129d1a20df6',
  'b851fa3e-0147-43f8-b679-09c0539fa6a0',
  '608d31f6-f1ff-43ab-9055-c7c2c93b272e',
  'f80c1009-518a-41bb-8879-2be6f348fc96',
  '8478c91d-5545-4759-9fc9-31fa56e991be',
  'b1331c18-c29f-4082-90e3-8ea0b48b8ea3',
  'a346309e-ea8b-4911-a5d3-ed531f168b42',
  '5ef5c493-0b58-49a6-a68b-af50ea3411f4'
 );

UPDATE medidores_list SET data = DATE '2026-09-11'
 WHERE id IN (
  'c4cb3be4-4b6f-4da9-9be3-f2ea4838ba67',
  '9c5501d4-78e6-4818-9bf9-a55172c3d99e',
  '3b0dd3f1-e8a1-4505-bb73-13b359fa9210',
  '8b01d919-55e0-49ae-b8c1-dfc00c7c9310',
  '40ed0594-032d-4e51-83b0-08e10f859ee1',
  'a2415f66-e144-474b-852c-f88ce6ad1d4d',
  'ca71c8dd-c6cb-44c4-a32b-3794ebdc2a34',
  'f09b8561-3fe7-4279-bac8-7a17e5443914',
  'b878db96-6c57-4666-a39c-74deb238998f',
  '7741fbe9-729d-42ed-a6d6-10d669754566',
  '816445c1-95fe-4435-8d47-4b3e2cb818b3',
  '4154b53e-9077-4ad9-a046-95e9f5961983',
  '97d30480-ffcf-4683-b064-762b8d70ce78',
  'fe255a97-8abc-4c36-b5d3-1781bdee04c9',
  'a003a8f8-306d-4666-b894-d8d1452078e2',
  '86690dcd-7228-4e49-a9b4-b6ee19decd3c',
  '2e8f6317-ec50-4742-b6d9-396c3c63ed6c',
  'd0586611-175d-439c-912d-19e7ade92606',
  'b835647f-a23c-4b4a-87e6-047e2025a4fb',
  '08e00551-bf7b-4d9a-a298-b27371152c73',
  'da10331b-c69d-4eb5-8586-1406e8ceb7a7'
 );

COMMIT;

-- Conferencia pos-execucao: deve retornar 0.
SELECT count(*) AS ainda_no_futuro FROM medidores_list WHERE data > DATE '2026-09-18';
