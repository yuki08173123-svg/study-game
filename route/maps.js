/* 極めた人のマップ（生徒が実際に使った 問題集マップ2・暗記マップ の原本）
   maps/<f>.jpg = 表示用（長辺1400）／ maps/orig/<f>.jpg = 原本（そのまま・位置情報は削除ずみ）
   sum = その問題集をやりきった記録（期間・日数・周回数）。日付と周回数はマップから読み取ったもの。
   このファイルは data.js とは別。スプレッドシートから data.js を作り直しても消えない。 */
const MAPS = {
  stock3000: {
    sum: { from:'3/15', to:'5/1', days:48, span:'約1ヶ月3週間', rounds:'6周', note:'このあと8/15に全テストで仕上げ' },
    items: [ { f:'stock3000-1', t:'暗記マップ', d:'1〜6周目＋8/15の全テスト' } ]
  },
  stock4500: {
    sum: { from:'5/14', to:'8/14', days:93, span:'約3ヶ月', rounds:'前半8周・後半5周', note:'' },
    items: [
      { f:'stock4500-1', t:'暗記マップ（前半 1〜1187）', d:'5/14〜7/22・1〜8周目' },
      { f:'stock4500-2', t:'暗記マップ（後半 1188〜2155）', d:'7/23〜8/14・1〜5周目' }
    ]
  },
  polaris0: {
    sum: { from:'3/17', to:'5/28', days:73, span:'約2ヶ月2週間', rounds:'4周', note:'' },
    items: [
      { f:'polaris0-1', t:'問題集マップ2', d:'3/17〜4/30・1〜3周目' },
      { f:'polaris0-2', t:'問題集マップ2', d:'5/7〜5/28・4周目' }
    ]
  },
  polaris1: {
    sum: { from:'5/27', to:'8/12', days:78, span:'約2ヶ月3週間', rounds:'4周', note:'' },
    items: [
      { f:'polaris1-1', t:'問題集マップ2', d:'5/27〜7/27・1〜3周目' },
      { f:'polaris1-2', t:'問題集マップ2', d:'7/28〜8/12・3〜4周目' }
    ]
  },
  saikyou_gendai: {
    sum: { from:'3/15', to:'5/24', days:71, span:'約2ヶ月2週間', rounds:'4周', note:'' },
    items: [ { f:'saikyou_gendai-1', t:'問題集マップ2', d:'1〜4周目' } ]
  },
  kijutsu: {
    sum: { from:'5/27', to:'7/28', days:63, span:'ちょうど9週間（約2ヶ月）', rounds:'3周', note:'' },
    items: [ { f:'kijutsu-1', t:'問題集マップ2', d:'1〜3周目' } ]
  },
  gendai_lv1: {
    sum: { from:'7/30', to:'9/14', days:47, span:'約1ヶ月2週間', rounds:'3周', note:'' },
    items: [ { f:'gendai_lv1-1', t:'問題集マップ2', d:'1〜3周目' } ]
  },
  kisomon_ia: {
    sum: { from:'3/16', to:'8/15', days:153, span:'約5ヶ月', rounds:'5周＋演習問題＋解き直し',
           note:'7周目までは「例題」だけ。復習テストのあとは5日分を解き直し' },
    items: [
      { f:'kisomon_ia-1', t:'問題集マップ2', d:'1周目（3/16〜）' },
      { f:'kisomon_ia-2', t:'問題集マップ2', d:'2周目' },
      { f:'kisomon_ia-3', t:'問題集マップ2', d:'3周目' },
      { f:'kisomon_ia-4', t:'問題集マップ2', d:'4周目' },
      { f:'kisomon_ia-5', t:'問題集マップ2', d:'5周目' },
      { f:'kisomon_ia-6', t:'問題集マップ2', d:'演習問題（8/4〜）' },
      { f:'kisomon_ia-7', t:'問題集マップ2', d:'解き直し（8/11〜8/15）' }
    ]
  }
};
