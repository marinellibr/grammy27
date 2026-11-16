# Grammy 2027 — dados das indicações

Dados do live blog oficial, coletados em 16/11/2026, com 98 categorias e 516 indicações.

Página: https://marinellibr.github.io/grammy27/

## Arquivos públicos

- [JSON completo](https://marinellibr.github.io/grammy27/grammy-2027-nominations.json)
- [Pendências do Spotify](https://marinellibr.github.io/grammy27/grammy-2027-spotify-pendencias.json)

388 indicações têm ID do Spotify confirmado e 302 têm URL de preview. Há 102 indicações pendentes e 26 de profissionais, filmes ou audiolivros tratados separadamente. Consulte `notes` e `spotify_summary` no JSON para detalhes. Para previews, use `preview_track_id` ou `preview_url`; `spotify_type` distingue IDs de faixa, álbum e artista.

Fonte: https://www.grammy.com/live-blog/

## Publicação

O workflow `.github/workflows/pages.yml` valida os JSONs e publica exclusivamente a pasta `site/` no GitHub Pages a cada push para `main`. Em Settings → Pages, a fonte deve permanecer **GitHub Actions**.

A coleta não é atualizada automaticamente. Para atualizar, substitua os JSONs em `site/`, atualize os totais na página e faça push para `main`.
