# _html-apps

複数のHTMLアプリをGitHub Pagesで公開するためのモノレポ。`main`にpushすると GitHub Actions が自動で `apps/` 配下をそのままPages公開する。

公開URL: `https://<GitHubユーザー名>.github.io/<このリポジトリ名>/<アプリ名>/`

## 新規アプリを追加する手順

1. `apps/<アプリ名>/index.html` を作成する（アセットも同フォルダ内に置く）
2. `apps/index.html` の一覧に1行リンクを追記する
3. `git add` → `git commit` → `git push`
4. Actionsタブでデプロイ完了を確認し、公開URLを開いて確認する

## 運用ルール

- 制作自体は各アプリの作業フォルダ（`Project/{日付}_{アプリ名}/00_original〜03_output`）で行い、完成したら `03_output/index.html` をこのリポジトリの `apps/<アプリ名>/` にコピーする（制作場所と公開場所を分離）
- 個人情報・社外秘情報を含むアプリはこのリポジトリに置かない（Publicリポジトリのため誰でも閲覧可能）
- 特定のアプリだけ単独リポジトリに分離したくなった場合は、その時点で `apps/<アプリ名>/` を切り出して新規リポジトリ化する
