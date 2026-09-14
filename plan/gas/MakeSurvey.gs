/* 計画マップアプリ アンケート（Googleフォーム）
   makeForm  … 新しく作る（初回だけ）
   updateForm … すでにあるフォームに「D. 総合」の項目を足して、番号をふり直す
   実行ログに「回答用URL」と「編集用URL」が出ます。 */

const FORM_ID = '1-IizDkTWeuiRhdzrOJBLobB5MDdqyE3N5Hj43is0MD0';

const FEATS = ['テンプレート', '先週のやることをコピー', '候補チップ（最近のやること）', '1週間をまとめて見る', '時間わりで見る',
               '提出する（アプリをえらんで送る）', '目標タブ', '記録タブ（TQCの推移）', 'Qランキングに送る', '同期（スマホとパソコン）', 'カウントダウン'];

function makeForm() {
  const f = FormApp.create('計画マップアプリ アンケート');
  f.setDescription('約5分で終わります。名前は書かなくても大丈夫です。\n正直に答えてもらえると、次にどこを直すかがそのまま決まります。よろしくお願いします。');
  f.setCollectEmail(false);
  f.setProgressBar(true);
  f.setConfirmationMessage('ありがとうございました！ 結果をもとに、次のアップデートを決めます。');

  f.addTextItem().setTitle('名前（任意）').setHelpText('書かなくてもOKです。');
  f.addMultipleChoiceItem().setTitle('学年').setRequired(true)
    .setChoiceValues(['小学生', '中学1年', '中学2年', '中学3年', '高校1年', '高校2年', '高校3年', '浪人・その他']);

  f.addSectionHeaderItem().setTitle('A. 使いかた');
  f.addMultipleChoiceItem().setTitle('計画マップは、いまどの形で作っていますか？').setRequired(true)
    .setChoiceValues(['アプリだけ', '紙だけ', '両方（週によって）', '最近は作れていない']);
  f.addMultipleChoiceItem().setTitle('アプリを開く頻度は？').setRequired(true)
    .setChoiceValues(['毎日', '週に数回', '日曜の提出のときだけ', 'ほとんど開かない']);
  f.addMultipleChoiceItem().setTitle('1週間の計画を立てるのに、いまかかる時間は？').setRequired(true)
    .setChoiceValues(['10分以内', '10〜30分', '30分〜1時間', '1時間以上']);
  f.addMultipleChoiceItem().setTitle('アプリを使う前と比べて、計画を立てる時間は？').setRequired(true)
    .setChoiceValues(['かなり短くなった', '少し短くなった', '変わらない', '長くなった', 'アプリの前は作っていなかった']);

  f.addSectionHeaderItem().setTitle('B. 機能');
  f.addCheckboxItem().setTitle('よく使っている機能をすべて選んでください').setChoiceValues(FEATS.concat(['使っている機能はほとんどない']));
  f.addCheckboxItem().setTitle('「あるのは知っているけど使っていない」機能があれば選んでください').setChoiceValues(FEATS.concat(['特にない']));
  f.addMultipleChoiceItem().setTitle('TQCスコアが自動で出ることについて').setRequired(true)
    .setChoiceValues(['やる気につながっている', '見てはいるが特に影響なし', 'ほとんど見ていない', '数字が気になって逆にしんどい']);

  f.addSectionHeaderItem().setTitle('C. 困りごと');
  f.addCheckboxItem().setTitle('使っていて困ること・分かりにくいことがあれば、すべて選んでください')
    .setChoiceValues(['入力に手間がかかる', 'どこを押せばいいか迷う', '提出のやり方が分かりにくい', '更新（オレンジの帯）が分かりにくい',
                      'データが消えた／消えそうで不安', '画像が見にくい', '特にない']);
  f.addParagraphTextItem().setTitle('いちばん直してほしいこと・ほしい機能を「1つだけ」書いてください').setHelpText('短くてOKです。');

  f.addSectionHeaderItem().setTitle('D. 総合');
  addTotalItems_(f);
  renumber_(f);
  Logger.log('回答用URL: ' + f.getPublishedUrl());
  Logger.log('編集用URL: ' + f.getEditUrl());
}

/* すでに配ったフォームを、URLを変えずに直す */
function updateForm() {
  const f = FormApp.openById(FORM_ID);

  // 「その点数の理由を一言で」は、あとの「感想」に置きかえるので消す
  f.getItems().forEach(function (it) {
    if (/その点数の理由/.test(it.getTitle())) f.deleteItem(it);
  });

  const added = addTotalItems_(f);

  // 「D. 総合」の見出しのすぐ下に、順番どおりに並べ直す（NPSは満足度などのあと）
  const dHead = f.getItems(FormApp.ItemType.SECTION_HEADER).filter(function (x) { return /D\./.test(x.getTitle()); })[0];
  let at = dHead.getIndex() + 1;
  ['sat', 'chg', 'pmf', 'best'].forEach(function (k) { f.moveItem(added[k].getIndex(), at++); });
  // NPS → 感想 → 掲載可否 の順にする
  const nps = f.getItems().filter(function (x) { return /すすめますか/.test(x.getTitle()); })[0];
  f.moveItem(nps.getIndex(), at++);
  f.moveItem(added.voice.getIndex(), at++);
  f.moveItem(added.ok.getIndex(), at++);

  renumber_(f);
  Logger.log('回答用URL: ' + f.getPublishedUrl());
  Logger.log('編集用URL: ' + f.getEditUrl());
}

/* D. 総合 の中身（満足度・変化・なくなったら・良かった機能・NPS・感想・掲載可否） */
function addTotalItems_(f) {
  const sat = f.addMultipleChoiceItem().setTitle('計画マップアプリの、いまの満足度は？').setRequired(true)
    .setChoiceValues(['とても満足', '満足', 'ふつう', 'あまり満足していない', '不満']);

  const chg = f.addCheckboxItem().setTitle('アプリを使いはじめてから「変わった」と感じることを、すべて選んでください')
    .setHelpText('変わっていないものは選ばなくて大丈夫です。')
    .setChoiceValues(['計画を立てる時間が短くなった', '計画マップを出せる週が増えた', '勉強時間が増えた',
                      'やることを決めやすくなった', '計画どおりに進む週が増えた',
                      '自分がやれていないところに気づけるようになった', '極まった（★）を意識するようになった',
                      '特に変わっていない']);

  const pmf = f.addMultipleChoiceItem().setTitle('もし計画マップアプリが使えなくなったら、どう感じますか？').setRequired(true)
    .setChoiceValues(['とても困る', '少し困る', '困らない（紙のほうがいい・紙でも同じ）']);

  const best = f.addParagraphTextItem().setTitle('いちばん助かっている機能を「1つだけ」教えてください')
    .setHelpText('短くてOKです。');

  const nps = f.addScaleItem().setTitle('友だち（塾生）に「計画マップアプリ、使ったほうがいい」とすすめますか？').setRequired(true)
    .setBounds(0, 10).setLabels('すすめない', '強くすすめる');

  const voice = f.addParagraphTextItem().setTitle('計画マップアプリを使ってみた感想を、一言おねがいします')
    .setHelpText('良かったところ・変わったこと・正直な気持ち、どれでもOKです。');

  const ok = f.addMultipleChoiceItem().setTitle('上の感想を、アプリの紹介や塾の案内に使わせてもらってもいいですか？').setRequired(true)
    .setChoiceValues(['名前つきでOK', '名前なし（学年だけ）ならOK', '使わないでほしい']);

  return { sat: sat, chg: chg, pmf: pmf, nps: nps, best: best, voice: voice, ok: ok };
}

/* 質問の番号をふり直す（名前・学年・見出しは番号なし） */
function renumber_(f) {
  let n = 0;
  f.getItems().forEach(function (it) {
    const t = it.getType();
    if (t === FormApp.ItemType.SECTION_HEADER || t === FormApp.ItemType.PAGE_BREAK || t === FormApp.ItemType.IMAGE) return;
    const raw = it.getTitle().replace(/^\d+\.\s*/, '');
    if (/^名前（任意）$/.test(raw) || /^学年$/.test(raw)) { it.setTitle(raw); return; }
    it.setTitle((++n) + '. ' + raw);
  });
}
