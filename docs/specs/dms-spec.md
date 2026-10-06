# Especificação - Document Management System

## 1. Objetivo

Permitir que usuários enviem, listem e baixem documentos armazenados localmente, com metadados mantidos em memória nesta fase.

## 2. Escopo

### Dentro do escopo

- Upload de um documento por requisição.
- Listagem dos documentos associados ao usuário.
- Download de um documento pelo identificador.
- Identificação simples do proprietário por requisição.
- Validação de entrada e respostas de erro consistentes.
- Armazenamento dos arquivos no filesystem local e dos metadados em memória.

### Fora do escopo

- Armazenamento externo ou em nuvem.
- Persistência de metadados em banco de dados.
- Autenticação, cadastro de usuários ou gestão de credenciais.
- Versionamento, edição ou exclusão de documentos.
- Upload de múltiplos arquivos em uma única requisição.
- Pesquisa avançada, compartilhamento ou controle de acesso granular.

## 3. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-01 | O usuário pode enviar um arquivo por `multipart/form-data`, no campo `file`. |
| RF-02 | O sistema deve rejeitar requisições sem arquivo ou com arquivo vazio. |
| RF-03 | O sistema deve limitar o tamanho do upload conforme configuração; o padrão inicial é 10 MiB. |
| RF-04 | O sistema deve gerar um identificador único e um nome de armazenamento seguro, sem usar o nome original como caminho. |
| RF-05 | O sistema deve registrar os metadados do documento após o arquivo ser gravado com sucesso. |
| RF-06 | O usuário pode listar apenas os documentos associados ao seu identificador. |
| RF-07 | O usuário pode baixar um documento pelo identificador, desde que pertença a ele. |
| RF-08 | O sistema deve informar erro quando o documento não existir, não estiver acessível ao usuário ou não puder ser lido. |
| RF-09 | Respostas de sucesso e erro devem seguir os contratos definidos nesta especificação. |
| RF-10 | Se a gravação dos metadados falhar após o upload, o arquivo gravado deve ser removido para evitar arquivo órfão. |

A identificação do usuário será recebida no cabeçalho `X-User-Id`. Esse identificador serve para associação e filtragem nesta fase, mas não substitui autenticação nem oferece proteção contra falsificação.

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos devem ser gravados localmente em `backend/storage`, usando `multer` com `diskStorage`. |
| RNF-02 | Os metadados devem permanecer em memória; reiniciar o processo pode perder os registros. |
| RNF-03 | Caminho de armazenamento, porta e limite de upload devem ser configuráveis por variáveis de ambiente. |
| RNF-04 | A aplicação não deve depender de provedores externos de armazenamento. |
| RNF-05 | O backend deve usar Node.js, Express e CommonJS; os testes devem usar `node:test`. |
| RNF-06 | A API deve tratar falhas de entrada, leitura e escrita sem expor caminhos locais ou detalhes internos. |
| RNF-07 | O frontend deve consumir a API via prefixo `/api`, usando o proxy configurado no Vite. |
| RNF-08 | Os metadados retornados pela API não devem expor caminho ou nome interno do arquivo armazenado. |

Configuração prevista:

| Variável | Padrão | Finalidade |
| --- | --- | --- |
| `PORT` | `3000` | Porta HTTP do backend. |
| `STORAGE_DIR` | `backend/storage` | Diretório local dos arquivos. |
| `MAX_FILE_SIZE_MB` | `10` | Limite de tamanho por arquivo, em MiB. |

## 5. Modelo de dados

### Metadados públicos do documento

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | string | Identificador único, gerado pelo servidor. |
| `originalName` | string | Nome original fornecido pelo cliente, apenas para exibição e download. |
| `size` | number | Tamanho do arquivo em bytes. |
| `uploadedAt` | string | Data e hora do upload em ISO 8601. |
| `owner` | string | Identificador recebido em `X-User-Id`. |

O registro interno do repositório também associa o documento ao nome seguro do arquivo no disco. Esse dado é privado e não deve aparecer nas respostas HTTP. O caminho deve ser resolvido dentro do diretório configurado, sem aceitar caminhos enviados pelo cliente.

## 6. Contratos de API

As rotas do backend são `/upload`, `/documents` e `/documents/:id/download`. No frontend, elas são acessadas pelo prefixo `/api` configurado no proxy do Vite.

### `POST /upload`

- Cabeçalho obrigatório: `X-User-Id`.
- Entrada: `multipart/form-data` com um arquivo no campo `file`.
- Sucesso: `201 Created`, com os metadados públicos do documento.

Exemplo de resposta:

```json
{
  "id": "identificador-gerado",
  "originalName": "relatorio.pdf",
  "size": 2048,
  "uploadedAt": "2026-10-06T12:00:00.000Z",
  "owner": "usuario-123"
}
