/**
 * 商談音声リネーム判定 Web App
 *
 * Android端末(Tasker)から録音ファイルの作成時刻を受け取り、
 * Googleカレンダーの商談予定と突き合わせて、リネーム後のファイル名を返す。
 *
 * デプロイ前に、スクリプトエディタの「プロジェクトの設定」>「スクリプト プロパティ」で
 * SHARED_SECRET を設定すること（Taskerからのリクエストと照合する合言葉）。
 */

var MATCH_WINDOW_MINUTES = 30;
var FIXED_TITLE_SUFFIX = 'お打合せ議事録';

/**
 * Web Appのエントリポイント。
 * リクエストボディ(JSON): { "secret": "...", "timestampMillis": 1234567890000 }
 * レスポンス(JSON):
 *   成功: { "matched": true, "newFileName": "2026年8月2日(日)10：00〜_田中太郎様_お打合せ議事録@会議室A" }
 *   不一致: { "matched": false, "candidateCount": 0 }
 *   エラー: { "matched": false, "error": "..." }
 */
function doPost(e) {
  var result;
  try {
    var body = JSON.parse(e.postData.contents);
    var expectedSecret = PropertiesService.getScriptProperties().getProperty('SHARED_SECRET');

    if (!expectedSecret) {
      result = { matched: false, error: 'SHARED_SECRET が未設定です。スクリプトプロパティを確認してください。' };
    } else if (body.secret !== expectedSecret) {
      result = { matched: false, error: 'unauthorized' };
    } else if (!body.timestampMillis) {
      result = { matched: false, error: 'timestampMillis is required' };
    } else {
      result = processTimestamp_(Number(body.timestampMillis));
    }
  } catch (err) {
    result = { matched: false, error: String(err) };
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * 指定時刻の前後 MATCH_WINDOW_MINUTES 分にある商談予定を検索し、判定結果を返す。
 */
function processTimestamp_(timestampMillis) {
  var center = new Date(timestampMillis);
  var start = new Date(center.getTime() - MATCH_WINDOW_MINUTES * 60 * 1000);
  var end = new Date(center.getTime() + MATCH_WINDOW_MINUTES * 60 * 1000);

  var events = CalendarApp.getDefaultCalendar().getEvents(start, end);

  var candidates = [];
  events.forEach(function (event) {
    var clientName = extractClientName_(event.getTitle());
    if (clientName) {
      candidates.push({ event: event, clientName: clientName });
    }
  });

  if (candidates.length !== 1) {
    return { matched: false, candidateCount: candidates.length };
  }

  var chosen = candidates[0];
  var newFileName = buildFileName_(
    chosen.event.getStartTime(),
    chosen.clientName,
    chosen.event.getLocation()
  );
  return { matched: true, newFileName: newFileName };
}

/**
 * 予定タイトルから「◯◯様」直前の氏名らしき文字列を抽出する。
 * 見つからない場合はnullを返す（=商談予定として扱わない）。
 */
function extractClientName_(title) {
  if (!title) return null;
  var match = title.match(/([一-龠ぁ-んァ-ヶA-Za-zー]+)様/);
  return match ? match[1] : null;
}

/**
 * ユーザー指定フォーマットでファイル名（拡張子なし）を生成する。
 * 例: 2026年8月2日(日)10：00〜_田中太郎様_お打合せ議事録@会議室A
 *
 * コロンは半角(:)だとAndroid/Windowsのファイルシステムで使えないため、
 * 全角(：)に変換して安全なファイル名にしている。
 */
function buildFileName_(startTime, clientName, location) {
  var weekdayKanji = ['日', '月', '火', '水', '木', '金', '土'];
  var y = startTime.getFullYear();
  var m = startTime.getMonth() + 1;
  var d = startTime.getDate();
  var weekday = weekdayKanji[startTime.getDay()];
  var hh = ('0' + startTime.getHours()).slice(-2);
  var mm = ('0' + startTime.getMinutes()).slice(-2);

  var base = y + '年' + m + '月' + d + '日(' + weekday + ')' + hh + '：' + mm + '〜_' +
    clientName + '様_' + FIXED_TITLE_SUFFIX;

  if (location) {
    base += '@' + location;
  }
  return base;
}

/**
 * 動作確認用（スクリプトエディタから直接実行する）。
 * 実行後、ログ(表示 > ログ)で結果を確認できる。
 * 対象カレンダーに「テスト太郎様と商談」のような予定を、実行時刻の近くに作っておくこと。
 */
function testProcessTimestamp() {
  var result = processTimestamp_(new Date().getTime());
  Logger.log(JSON.stringify(result));
}
