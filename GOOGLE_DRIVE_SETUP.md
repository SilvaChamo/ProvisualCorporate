# Guia de Configuração: Google Drive + ProVisual

Este guia explica como conectar o seu Google Drive ao ProVisual para buscar arquivos automaticamente.

## 1. Configuração no Google Cloud Console

1.  Aceda ao [Google Cloud Console](https://console.cloud.google.com/).
2.  Crie um novo projeto chamado **"ProVisual-Drive"**.
3.  No menu lateral, vá a **APIs e Serviços > Biblioteca**.
4.  Pesquise por **"Google Drive API"** e clique em **Ativar**.
5.  Vá a **APIs e Serviços > Credenciais**.
6.  Clique em **Criar Credenciais > Conta de Serviço**.
7.  Dê um nome (ex: `drive-sync`) e clique em **Criar e Continuar**.
8.  Na lista de Contas de Serviço, clique no email da conta que criou.
9.  Vá ao separador **Chaves > Adicionar Chave > Criar nova chave (JSON)**.
10. O download de um arquivo `.json` será feito. **Guarde este arquivo em segurança**, ele é a sua chave de acesso.

## 2. Dar Permissão às Pastas do Drive

Para que o sistema consiga ler os seus arquivos, você precisa partilhar a pasta do Google Drive com o email da Conta de Serviço:

1.  Abra o seu Google Drive.
2.  Clique com o botão direito na pasta que deseja sincronizar.
3.  Clique em **Partilhar**.
4.  Cole o email da Conta de Serviço (ex: `drive-sync@projeto.iam.gserviceaccount.com`).
5.  Dê permissão de **Leitor** e salve.

## 3. Implementação Técnica (Resumo)

Para buscar os dados no código, usaremos a biblioteca `googleapis`. 

### Exemplo de código para buscar arquivos:

```javascript
const { google } = require('googleapis');
const keys = require('./sua-chave-baixada.json');

const auth = new google.auth.JWT(
  keys.client_email,
  null,
  keys.private_key,
  ['https://www.googleapis.com/auth/drive.readonly']
);

const drive = google.drive({ version: 'v3', auth });

async function listFiles(folderId) {
  const res = await drive.files.list({
    q: `'${folderId}' in parents`,
    fields: 'files(id, name, mimeType, webViewLink, size)',
  });
  return res.data.files;
}
```

## 4. Próximos Passos
Se desejar que eu implemente a sincronização automática agora, por favor:
1.  Me envie o conteúdo do arquivo JSON que você baixou.
2.  Me diga o ID da pasta do Google Drive que você quer sincronizar (o código longo que aparece no link da pasta no navegador).
