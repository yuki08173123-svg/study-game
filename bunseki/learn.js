/* 分析を学ぶ（スライドと動画）
   スライドの元：ヒラの動画5本
   - 分析マップの使い方 https://youtu.be/xKcVUAVAkkQ
   - 分析マップのアップデート（KK率）Loom
   - KK率の出し方と戦略立て https://youtu.be/U1NFZE84Yq8
   - シークレット会6 テストバイブル（分析編 2:02:09〜）https://youtu.be/o1alKonFUig
   - マインド動画86 分析 https://youtu.be/nczecoWqqxI
   各スライドの v: は元の動画の場所（秒）。押すとその場面から見られる。 */

const VID = {
  use:   { id: 'xKcVUAVAkkQ', name: '分析マップの使い方', kind: 'YouTube' },
  loom:  { id: '54b2e147bddf40b789ebf6ecdd272447', name: '分析マップのアップデート（KK率）', kind: 'Loom', loom: true },
  kk:    { id: 'U1NFZE84Yq8', name: 'KK率の出し方と戦略立て', kind: 'YouTube' },
  bible: { id: 'o1alKonFUig', name: 'シークレット会6 テストバイブル', kind: 'YouTube' },
  mind:  { id: 'nczecoWqqxI', name: 'マインド動画86 分析', kind: 'YouTube' },
};
function vurl(k, t) {
  const v = VID[k];
  if (v.loom) return 'https://www.loom.com/share/' + v.id + (t ? '?t=' + t : '');
  return 'https://youtu.be/' + v.id + (t ? '?t=' + t : '');
}
function hms(t) { const h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = t % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0'); }

const SLIDES = [
  { sec: 'はじめに', t: '分析を学ぶ', v: [['mind', 1214]], h: `
    <div class="quote">答えを教えてくれるのが、分析です。</div>
    <p>「次に何をすればいいですか？」の答えは、先生でも友達でもAIでもなく、<b>自分の答案の中</b>にあります。</p>
    <p>このスライドでは、分析の考え方と、分析マップの書き方を順番に学びます。</p>
    <div class="box">全{N}枚・約10分。気になったところは、下の「▶ 動画」からヒラの説明を見られます。</div>` },

  /* ── 1. 分析とは ── */
  { sec: '1 分析とは', t: '分析＝現在から未来を管理すること', v: [['mind', 77]], h: `
    <div class="flow">
      <div>現在がわかる<small>自分の立ち位置・いまの状況が丸裸になる</small></div><i>▼</i>
      <div>未来がわかる<small>これから何をすればいいかが見える</small></div>
    </div>
    <p>模試を受けて分析すると、自分の状況が全部わかります。わかるから、次にやることが決まります。</p>
    <p>だから分析は<b>最強のスキル</b>です。` },

  { sec: '1 分析とは', t: '分析思考＝内容を「完全把握」する思考', v: [['mind', 149], ['mind', 266]], h: `
    <p>完全把握とは、次の2つができる状態です。</p>
    <ul><li><b>すらすら説明できる</b></li><li><b>質問されたら、はっきり答えられる</b></li></ul>
    <p>ほとんどの人は、ふだん何も考えずに（無思考で）過ごしています。でも、決めたことについて考える、と意識すれば、分析はだれでもできます。</p>
    <div class="box">うまくいかなかったことの<b>原因</b>と<b>改善点</b>が言えないなら、まだ完全把握できていません。</div>` },

  { sec: '1 分析とは', t: '言語化なくして改善なし、分析なくして成果なし', v: [['mind', 368], ['mind', 453]], h: `
    <div class="quote">言語化なくして改善なし<br>分析なくして成果なし</div>
    <p>成果が出ない原因は、たいてい<b>言語化していない</b>か<b>分析していない</b>かのどちらかです。</p>
    <p>1問ずつ「なぜできなかったのか」を考えれば、分析に時間がかかるのは当たり前。<b>かけていい。かけないといけない。</b>時間をかけると、何をすればいいかが完全に見えます。</p>
    <div class="box">ある生徒の言葉：「<b>分析がいちばん面白い</b>」</div>
    <div class="ng">「分析はめんどくさい」と言う人は伸びません。</div>` },

  { sec: '1 分析とは', t: '自分の答案は宝', v: [['bible', 7652], ['mind', 562]], h: `
    <p>「何を勉強したらいいですか？」は、分析していない人が言う言葉です。</p>
    <p>答案には、自分の実力がそのまま見える形で出ています。点数や判定だけを見て、答案を見ないのはもったいない。</p>
    <div class="quote">自分の答案は宝です。<br>答えは答案の中にあります。</div>
    <p>まず自分で分析して、それを先生に見てもらう。この順番です。</p>` },

  /* ── 2. 分析の3ステップ ── */
  { sec: '2 分析の3ステップ', t: '分析は3ステップで進める', v: [['mind', 695]], h: `
    <div class="flow">
      <div>① 分解する<small>バラバラにして、原因をはっきりさせる</small></div><i>▼</i>
      <div>② タスク化する<small>何を・いつ・どれくらい・何々する</small></div><i>▼</i>
      <div>③ 進捗管理する<small>やったかどうかを見える形にする</small></div>
    </div>
    <p>上から順番に。どこかで止まると、未来は変わりません。</p>` },

  { sec: '2 分析の3ステップ', t: '① 分解する', v: [['mind', 702]], h: `
    <p>パズルのピースのように、1つずつバラバラにします。たとえば模試のまちがえた問題なら：</p>
    <ul><li>ケアレスミスをした</li><li>暗記が足りなかった</li><li>基礎が抜けていた</li><li>まったくわからなかった</li><li>途中で解き方がわからなくなった</li><li>計算に時間がかかって時間が足りなかった</li></ul>
    <p>「ケアレスミス」も、さらに分けられます（問題を読んでいない・焦っていた・雑に計算した…）。</p>
    <div class="box"><b>もうこれ以上分けられない</b>ところまで分けるのが分析です。</div>` },

  { sec: '2 分析の3ステップ', t: '分解の道具：エピソードと5W1H', v: [['mind', 794], ['mind', 919]], h: `
    <p><b>エピソード</b>：始まりから終わりまでを、物語のように言葉にします。</p>
    <div class="box">問題で詰まった → スマホを見た → 30分の動画を最後まで見た → おすすめ動画も見た → 1時間たっていた</div>
    <p>物語にすると「詰まったら簡単な問題に移ればよかった」など、改善点が自然に出てきます。</p>
    <p><b>5W1H</b>：どこで（Where）・何を（What）・なぜ（Why）・次はどうやって（How）、と当てはめると勝手に分解できます。</p>` },

  { sec: '2 分析の3ステップ', t: '② タスク化する', v: [['mind', 986]], h: `
    <div class="quote">何を・いつ・どれくらい・何々する</div>
    <p>分析のゴールは、この形に落とし込むことです。</p>
    <div class="box">理科の「地震」の点がとても低かった<br>→ <b>理科の問題集の地震（20ページ）を、1か月以内に、3周する</b></div>
    <p>ここまで決まれば、何をすればいいかがわかります。分析したのにやることがわからないなら、まだ分析できていません。</p>` },

  { sec: '2 分析の3ステップ', t: '③ 進捗管理する', v: [['mind', 1093]], h: `
    <p>タスクを決めても、やらなければ未来は何も変わりません。</p>
    <ul><li>決めた範囲の「できぐあい」を見える形にする</li><li>終わったら線を引く・チェックをつける</li><li>いつまでにやるかを具体的に決めておく</li></ul>
    <p>頭の中で「ここまで終わった」と覚えておくのではなく、紙やアプリに出して管理します。</p>
    <div class="box">このアプリでは、完成した分析マップの <b>□</b> を押すと「できた」の印がつきます。</div>` },

  /* ── 3. テスト分析の掟 ── */
  { sec: '3 テスト分析の掟', t: 'テスト分析の目的は2つだけ', v: [['bible', 7400]], h: `
    <div class="flow">
      <div>① 抜けをあぶり出す<small>まちがえた問題から「何が抜けているか」を見つける</small></div><i>▼</i>
      <div>② タスクを確定する<small>「これを極めたら伸びる」と言い切れるタスクを決める</small></div>
    </div>
    <p>本番の入試で抜けが見つかっても手遅れです。テストで見つかったなら、<b>やった！</b>です。いちばん優先して勉強すべきところを、テストが教えてくれたのですから。</p>` },

  { sec: '3 テスト分析の掟', t: '無感情で、淡々と', v: [['bible', 7557]], h: `
    <p>点数・判定・偏差値に一喜一憂するのは、分析の目的に1ミリも入っていません。</p>
    <p>偏差値が上がって喜ぶのはいい。でも、それで終わったら三流です。</p>
    <div class="box">分析マップに言葉にすること<br>・<b>何ができていたら取れたのか</b><br>・<b>これから何をすれば点数が上がるのか</b></div>` },

  { sec: '3 テスト分析の掟', t: '分析マップは返却後1週間以内に', v: [['bible', 7355], ['use', 738]], h: `
    <div class="quote">テスト（成績）返却後、<br>1週間以内に必ず提出</div>
    <p>理由はシンプルで、<b>忘れるから</b>。返ってきたら、すぐに書きます。</p>
    <p>模試・実力テスト・定期テスト・塾のテスト、資格試験なら過去問でもOK。テストを受けたら、全員必ず書きます。</p>` },

  /* ── 4. 分析マップの書き方 ── */
  { sec: '4 分析マップの書き方', t: '分析マップの全体像', v: [['use', 659]], h: `
    <div class="flow">
      <div>上段：事実<small>点数・平均点・順位・取れた失点…を書く</small></div><i>▼</i>
      <div>下段の左：なぜ？<small>取れた失点の原因を深く分析する</small></div><i>▼</i>
      <div>下段の右：どうする？<small>原因を解決する行動を数字で決める</small></div><i>▼</i>
      <div>計画マップに入れる<small>入れて、やって、極める</small></div>
    </div>
    <p>この流れを<b>線で結ぶ</b>のが分析マップです。</p>` },

  { sec: '4 分析マップの書き方', t: '上段は「事実」を書く', v: [['use', 71], ['use', 129]], h: `
    <ul>
      <li><b>テスト名・点数</b>：100点満点でないときは「150分の○○」のように</li>
      <li><b>平均点・順位・偏差値</b>：わかる範囲でOK。わからなければ空けておく</li>
    </ul>
    <p><b>平均点差異</b>（点数－平均点）で、前回からの伸びがわかります。</p>
    <div class="grid3"><div>前回<b>＋10</b></div><div>今回<b>＋15</b></div><div>伸び<b>＋5</b></div></div>
    <div class="ng">点数が上がっていても、平均点差異が下がっていれば「伸びた」とは言えません。</div>` },

  { sec: '4 分析マップの書き方', t: 'いちばん大事なのは「取れた失点」', v: [['use', 201], ['bible', 7723]], h: `
    <p>判定でも偏差値でも点数でもありません。<b>取れた失点</b>です。</p>
    <div class="bar"><div style="flex:80;background:var(--accent);color:var(--accent-ink)">点数 80</div><div style="flex:12;background:var(--shu);color:#fff">12</div><div style="flex:8;background:var(--gray);color:var(--muted)">8</div></div>
    <p class="mini">80点なら失点は20点。そのうち…</p>
    <ul><li><b style="color:var(--shu)">取れた失点 12点</b>：やったことがあるのに間違えた点。覚えていれば・ミスしなければ取れた</li><li><b>取れない失点 8点</b>：解法を見てもわからない点。まだ習っていない・まったく歯が立たなかった</li></ul>
    <p>点数を上げるとは、この<b>取れた失点を取ること</b>です。</p>` },

  { sec: '4 分析マップの書き方', t: '次の目標点＝点数＋取れた失点', v: [['use', 314]], h: `
    <div class="quote">80点 ＋ 取れた失点12点 ＝ 92点</div>
    <p>これが次の目標点です。取れた失点を全部取れば届く点数なので、ただの希望ではなく<b>根拠のある目標</b>になります。</p>
    <p>そして下段で「この12点をどうやって取るか」を考えます。</p>
    <div class="box">目安：取れた失点は<b>5点未満</b>におさえる。</div>` },

  { sec: '4 分析マップの書き方', t: '取れた失点は3種類だけ（M・A・K）', v: [['bible', 7723], ['bible', 7923]], h: `
    <div class="grid3">
      <div><b>M</b>ミス問題<br><small>計算・読みまちがい・スペル・漢字</small></div>
      <div><b>A</b>暗記問題<br><small>覚えていれば取れた</small></div>
      <div><b>K</b>教材類似問題<br><small>教材の問題と似ていた</small></div>
    </div>
    <p>まちがえた問題に <b>M・A・K</b> を書きこんでいきます。まったくわからない捨て問は「取れない失点」なので除外。</p>
    <div class="box">成果を出すとは、<b>ミス問題を減らし、暗記問題を取り、教材類似問題を取る</b>こと。</div>` },

  { sec: '4 分析マップの書き方', t: 'M・A・K、多いものから対策する', v: [['bible', 7869], ['bible', 7965], ['bible', 8008]], h: `
    <ul>
      <li><b>Mが多い</b> → ミス対策。ミスマップ、バックスキャンを極める</li>
      <li><b>Aが多い</b> → 暗記不足。暗記マップ、一問一答・単語帳、単語カード、限定ルール</li>
      <li><b>Kが多い</b> → 教材が極まっていない。問題集を黄金ルートで、マイスタを見つける、問題集の大原則</li>
    </ul>
    <p>落とした失点には、すべて原因があり、すべてに対策があります。</p>` },

  /* ── 5. KK率 ── */
  { sec: '5 KK率', t: 'KK率とは', v: [['loom', 95], ['kk', 314]], h: `
    <p><b>KK＝経験</b>。これまでやった問題の解き方を使えること（解法の活用）です。</p>
    <div class="quote">KK率＝やったことある・似てる問題のうち、正解できた割合</div>
    <p>「リハーサルでKKがどれだけできたか」は、ふつうは数字にできません。KK率を出すと、それが数字になります。</p>
    <p>分析マップの「取れた失点」の横に書きます。</p>` },

  { sec: '5 KK率', t: 'KK率の出し方（3ステップ）', v: [['kk', 182], ['kk', 394]], h: `
    <div class="num3">
      <div>① 全問題<b>53</b>問</div><i>›</i>
      <div>② やったことある・似てる<b>45</b>問</div><i>›</i>
      <div>③ ②のうち正解<b>41</b>問</div>
    </div>
    <div class="quote">KK率＝41÷45×100＝91%</div>
    <p>②では、見たことがない問題は数えません。②÷①は「KKできる問題の割合」です（45÷53＝85%）。</p>
    <p>問題用紙と答案があれば、数分で出せます。</p>` },

  { sec: '5 KK率', t: 'KK率は90%以上が当たり前', v: [['loom', 231], ['kk', 476]], h: `
    <p>90%以上が当たり前。かぎりなく100%に近づけないと、ふだんの勉強が身になっているとは言えません。</p>
    <div class="grid3"><div><b>90%〜</b>成果が出たと言える</div><div><b>80%台</b>しんどい</div><div><b>70%台</b>厳しい</div></div>
    <p>KKできたのに落とした問題が<b>穴</b>で、これがほぼ取れた失点です。「なぜそこが極まっていなかったのか」を分析します。</p>
    <p>前回と今回のKK率を、点数の変化と並べて見ると最強です。</p>` },

  { sec: '5 KK率', t: 'KK率から次の作戦を立てる', v: [['kk', 900]], h: `
    <div class="flow">
      <div>KKできなかった分を補う<small>91%なら残りの9%。落とした問題を極める</small></div><i>＋</i>
      <div>次に出そうなところを、KKできるように演習する</div>
    </div>
    <div class="box">点数が上がったときも「何をしたから取れたのか」（成功要因）を確かめます。たまたま得意な問題が出ただけなら、次は再現できません。</div>` },

  /* ── 6. なぜ？→どうする？ ── */
  { sec: '6 なぜ？→どうする？', t: '「なぜ？」は根本の原因まで', v: [['use', 396]], h: `
    <p>取れた失点が、なぜ失点になったのか。<b>何が足りなかったのか・何が弱点だったのか</b>を書き出します。</p>
    <p>「なんで？なんで？なんで？」と追いかけると、根本の原因が見つかります。思いついたことを、まずはどんどん書き出してOK。</p>
    <div class="ng">分析が浅いと、次のタスクが決まりません。</div>` },

  { sec: '6 なぜ？→どうする？', t: '「どうする？」は数字で書く', v: [['use', 565]], h: `
    <p>左の原因を解決する行動を、<b>教材・個数・周回数・正答率・期限</b>の数字で書きます。数字にすれば、勝手に具体的になります。</p>
    <div class="ng">×「見直しをする」「注意する」「意識する」</div>
    <div class="box">計算ミス → 途中式をさぼった → 焦っていた<br>→ <b>途中式は、すべての問題で全部書く</b></div>
    <p>「これをやれば、この取れた失点は絶対取れる」と言えるものにします。タスクは3つくらいに絞ってもOK（多くても6つまで）。</p>` },

  { sec: '6 なぜ？→どうする？', t: '書いたら必ず計画マップへ', v: [['use', 659], ['bible', 7598]], h: `
    <p>分析マップに書いたことは、放っておくと風化します。書いて終わり・提出して終わりでは意味がありません。</p>
    <div class="flow"><div>分析マップのタスク</div><i>▼</i><div>計画マップに入れる</div><i>▼</i><div>計画どおりにやって、タスクを極める</div></div>
    <div class="box">このアプリでは「計画マップに入れる（コピー）」→ 計画マップの「分析マップから読みこむ」で入ります。</div>` },

  /* ── まとめ ── */
  { sec: 'まとめ', t: '伸びない人の4つの特徴', v: [['bible', 8150]], h: `
    <ol>
      <li>取れた失点を、取れた得点に変える勉強をしていない</li>
      <li>取れた失点を分析していない</li>
      <li>取れた失点に対するタスクを設定していない</li>
      <li>そのタスクを極めていない</li>
    </ol>
    <p>全部「取れた失点」の話です。この4つを、1から順番にできるようにします。</p>` },

  { sec: 'まとめ', t: '確認テストに挑戦', v: [], h: `
    <p>ここまでの内容を、<b>確認テスト（第1回〜第3回・各10問）</b>で確かめましょう。1問10点、各100点満点です。</p>
    <div class="flow">
      <div>第1回　分析の考え方<small>スライド1〜13</small></div>
      <div>第2回　分析マップの書き方<small>スライド14〜19</small></div>
      <div>第3回　KK率となぜ？どうする？<small>スライド20〜29</small></div>
    </div>
    <button class="btn pri wide" data-goquiz="1">第1回をはじめる</button>
    <p class="mini" style="margin-top:8px">「学ぶ」タブの「確認テスト」からも受けられます。点数はそこに残ります。</p>` },

  { sec: 'まとめ', t: 'テストで結果を出すサイクル', v: [['bible', 8259]], h: `
    <div class="flow">
      <div>準備編（テスト前）<small>テストマップ</small></div><i>▼</i>
      <div>本番編（テスト中）<small>テストマニュアル</small></div><i>▼</i>
      <div>分析編（テスト後）<small>分析マップ → 計画マップ</small></div><i>▼ くり返す</i>
    </div>
    <p>このサイクルを回し続けることで、成績が伸び、偏差値が上がります。</p>
    <div class="quote">答えを教えてくれるのが、分析です。</div>` },
];

/* ── 確認テスト（第1回〜第3回・各10問・4択） ─────────────
   a: 正解の選択肢（いつも先頭に書く。出すときに並びをまぜる）
   s: 復習するスライドの番号（1から）  e: 解説 */
const QUIZ = [
  { no: 1, name: '分析の考え方', range: 'スライド1〜13', q: [
    { t: '分析をすると、何ができるようになる？', a: ['現在の状況がわかり、これから何をすればいいかが見える', '点数が自動で上がる', '勉強時間を減らせる', 'ほかの人と順位を比べられる'], s: 2, e: '分析は「現在から未来を管理する」こと。いまの状況が丸裸になり、次にやることが見えます。' },
    { t: '「完全把握」している状態はどれ？', a: ['すらすら説明でき、質問にもはっきり答えられる', '答えを見ればわかる', '一度読んだことがある', 'ノートにきれいにまとめてある'], s: 3, e: '完全把握＝すらすら説明できる・質問されたらはっきり答えられる状態です。' },
    { t: '「言語化なくして改善なし、（　）なくして成果なし」。（　）に入るのは？', a: ['分析', '努力', '時間', '才能'], s: 4, e: '言語化なくして改善なし、分析なくして成果なし。' },
    { t: '分析にかける時間について、正しいのは？', a: ['時間がかかるのは当たり前。かけていい', 'なるべく5分以内で終わらせる', '時間をかけるのはむだ', '点数が悪かったときだけかける'], s: 4, e: '1問ずつ原因を考えれば時間がかかるのは当たり前。かけるほど、やることがはっきり見えます。' },
    { t: '偏差値が10上がってうれしい。正しい行動は？', a: ['喜んでいいが、抜けをあぶり出してタスクを決めるまでやる', 'よかったので今回は分析を休む', '偏差値だけ記録しておく', '次も上がるように気合を入れる'], s: 12, e: '喜ぶのはかまわない。でもそれで終わったら三流。無感情で淡々と分析します。' },
    { t: '分析の3ステップの正しい順番は？', a: ['分解する → タスク化する → 進捗管理する', 'タスク化する → 分解する → 進捗管理する', '進捗管理する → 分解する → タスク化する', '分解する → 進捗管理する → タスク化する'], s: 6, e: '上から順番に。どこかで止まると未来は変わりません。' },
    { t: '「分解する」とき、どこまで分ける？', a: ['もうこれ以上分けられないところまで', '3つに分けたら十分', '教科ごとに分ければ十分', '分けずにまとめて考える'], s: 7, e: '「ケアレスミス」も、読んでいない・焦った・雑に計算した…とさらに分けられます。' },
    { t: 'タスク化の形として正しいのは？', a: ['何を・いつ・どれくらい・何々する', '何を・なぜ・だれと', 'いつ・どこで・だれが', '目標・気持ち・反省'], s: 9, e: '例：理科の問題集の地震（20ページ）を、1か月以内に、3周する。' },
    { t: 'テスト分析の目的2つは？', a: ['抜けをあぶり出す／タスクを確定する', '点数を記録する／順位を比べる', '反省する／やる気を出す', '平均点を出す／偏差値を出す'], s: 11, e: '目的はこの2つだけ。点数・判定・偏差値に一喜一憂するのは目的に入っていません。' },
    { t: '分析マップは、テスト（成績）返却後いつまでに提出する？', a: ['1週間以内', '1か月以内', '次のテストの前日まで', '気が向いたとき'], s: 13, e: '理由は「忘れるから」。返ってきたらすぐに書きます。' },
  ]},
  { no: 2, name: '分析マップの書き方', range: 'スライド14〜19', q: [
    { t: '分析マップの上段に書くのは？', a: ['事実（点数・平均点・順位など）', '反省の気持ち', '次の目標だけ', '先生からのコメント'], s: 15, e: '上段は事実だけを書くところ。わからない欄は空けておいてOK。' },
    { t: '前回の平均点差異が＋10、今回が＋15。正しいのは？', a: ['5点分伸びた', '15点伸びた', '伸びていない', '平均点が5点上がった'], s: 15, e: '平均点差異の変化（＋15－＋10＝5）で伸びがわかります。' },
    { t: '点数は上がったのに、平均点差異は下がった。正しいのは？', a: ['伸びたとは言えない', '伸びた', '偏差値は必ず上がっている', '気にしなくてよい'], s: 15, e: 'テストが簡単だっただけかもしれません。平均点差異で見ます。' },
    { t: '分析マップで、いちばん大事な数字は？', a: ['取れた失点', '偏差値', '点数', '判定'], s: 16, e: '判定でも偏差値でも点数でもなく、取れた失点です。' },
    { t: '100点満点で80点。取れた失点が12点。取れない失点は？', a: ['8点', '12点', '20点', '92点'], s: 16, e: '失点は100－80＝20点。そのうち取れた失点が12点なので、取れない失点は20－12＝8点。' },
    { t: '82点で、取れた失点が9点。次の目標点は？', a: ['91点', '89点', '73点', '100点'], s: 17, e: '次の目標点＝点数＋取れた失点＝82＋9＝91点。' },
    { t: '取れた失点の目安は？', a: ['5点未満におさえる', '10点未満におさえる', '20点未満におさえる', '何点でもよい'], s: 17, e: '目安は5点未満です。' },
    { t: '取れた失点の3種類（M・A・K）は？', a: ['ミス問題・暗記問題・教材類似問題', '計算・漢字・英単語', '簡単・ふつう・難しい', '前半・中盤・後半'], s: 18, e: 'M＝ミス問題、A＝暗記問題、K＝教材類似問題。まちがえた問題に書きこみます。' },
    { t: 'まったくわからなかった捨て問は、どう扱う？', a: ['取れない失点なので除外する', 'M（ミス問題）にする', 'A（暗記問題）にする', 'K（教材類似問題）にする'], s: 18, e: '捨て問は取れない失点。M・A・Kには入れません。' },
    { t: 'K（教材類似問題）が多い人の対策は？', a: ['問題集を黄金ルートで極める・問題集の大原則', 'ミスマップ・バックスキャン', '単語カードだけをふやす', 'とくに何もしない'], s: 19, e: 'Kが多い＝教材が極まっていない。ミスマップ・バックスキャンはM（ミス）の対策です。' },
  ]},
  { no: 3, name: 'KK率となぜ？どうする？', range: 'スライド20〜29', q: [
    { t: 'KK率の「KK」とは？', a: ['経験（これまでやった問題の解き方を使えること）', '計算と記述', '確認と見直し', '基礎と基本'], s: 20, e: 'KK＝経験＝解法の活用です。' },
    { t: 'KK率の出し方として正しいのは？', a: ['正解できた数 ÷ やったことある・似てる問題の数', '正解できた数 ÷ 全問題数', 'やったことある・似てる問題の数 ÷ 全問題数', '点数 ÷ 満点'], s: 21, e: '③（②のうち正解）÷②（やったことある・似てる）×100。②÷①は「KKできる問題の割合」です。' },
    { t: '全53問、やったことある・似てる問題45問、そのうち正解41問。KK率は？', a: ['91%', '77%', '85%', '100%'], s: 21, e: '41÷45×100＝91%。' },
    { t: '全30問、やったことある・似てる問題25問、そのうち正解23問。KK率は？', a: ['92%', '77%', '83%', '100%'], s: 21, e: '23÷25×100＝92%。（25÷30＝83%は「KKできる問題の割合」）' },
    { t: '「やったことある・似てる問題」を数えるとき、数えないのは？', a: ['見たことがない問題', '計算問題', '記述問題', '最後の大問'], s: 21, e: '見たことがない問題は数えません。' },
    { t: 'KK率の目安は？', a: ['90%以上が当たり前', '50%あれば十分', '70%あれば十分', '気にしなくてよい'], s: 22, e: '90%以上が当たり前。かぎりなく100%に近づけます。' },
    { t: 'KK率が91%だった。次の作戦として正しいのは？', a: ['KKできなかった分を補う＋次に出そうなところをKKできるように演習する', '新しい問題集を始める', '91%なので何もしない', '点数が低い教科をやめる'], s: 23, e: '残りの9%（落とした問題）を極める＋出そうなところの演習です。' },
    { t: '「なぜ？」の書き方として正しいのは？', a: ['「なんで？」をくり返して、根本の原因まで書く', '「ケアレスミス」と一言だけ書く', '点数だけ書く', '書かなくてよい'], s: 24, e: '分析が浅いと、次のタスクが決まりません。' },
    { t: 'タスクとして、いちばん良いものは？', a: ['ワーク p.46〜71 を11/13までに3周する', '計算を見直す', 'ミスに注意する', 'もっと意識して勉強する'], s: 25, e: '教材・個数・周回数・正答率・期限の数字で書きます。「見直す・注意・意識」は行動になっていません。' },
    { t: '伸びない人の4つの特徴に「入っていない」のは？', a: ['分析マップのタスクを計画マップに入れて極めている', '取れた失点を分析していない', '取れた失点に対するタスクを設定していない', 'そのタスクを極めていない'], s: 27, e: '分析→タスク→計画マップ→極める、ができているのは伸びる人です。' },
  ]},
];
function quizRec(no) { S.quiz = S.quiz || {}; return S.quiz[no] = S.quiz[no] || { best: null, tries: [] }; }
function quizCards() {
  const total = QUIZ.reduce((x, z) => x + (quizRec(z.no).best ?? 0), 0);
  const doneAll = QUIZ.every(z => quizRec(z.no).best !== null);
  return `<h3 style="margin:20px 0 4px" id="quizTop">確認テスト</h3>
    <p class="mini" style="margin:0 0 6px">各10問・1問10点。何回でも受けられます。${doneAll ? `3回の合計（いちばん良い点）：<b style="color:var(--accent)">${total} / 300点</b>` : ''}</p>
    ${QUIZ.map(z => {
      const r = quizRec(z.no), last = r.tries[r.tries.length - 1];
      return `<button class="maprow" data-quiz="${z.no}">
        <div class="m"><div class="s">第${z.no}回・${z.range}</div><div class="n">${esc(z.name)}</div>
        <div style="margin-top:4px">${r.best === null ? '<span class="badge">まだ受けていません</span>' : `<span class="badge ${r.best === 100 ? 'ok' : ''}">${r.best === 100 ? '満点！' : '最高 ' + r.best + '点'}</span> <span class="badge">${r.tries.length}回受けた・前回 ${last.sc}点</span>`}</div></div>
        <div class="goal">${r.best === null ? '<span style="font-size:15px">はじめる ›</span>' : r.best + '<small>点</small>'}</div>
      </button>`;
    }).join('')}`;
}
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
let qz = null;  // { z, i, ans:[{pick, ok}], opts:[[...]] }
function openQuiz(no) {
  const z = QUIZ.find(x => x.no === no);
  qz = { z, i: 0, ans: [], opts: z.q.map(q => shuffle(q.a)) };
  if (!svEl) openSlides(slideNo());   // スライドの画面（.sv）を作ってから使う
  svEl.hidden = false; document.body.style.overflow = 'hidden';
  svEl.dataset.mode = 'quiz';
  drawQuiz();
}
function drawQuiz() {
  const { z, i } = qz, n = z.q.length;
  $('svC').textContent = '第' + z.no + '回　' + (i < n ? (i + 1) + ' / ' + n : '結果');
  $('svP').style.width = (Math.min(i, n) / n * 100) + '%';
  if (i >= n) return drawQuizResult();
  const q = z.q[i], a = qz.ans[i];
  const correct = q.a[0];
  $('svStage').innerHTML = `<div class="sl">
    <div class="sec">確認テスト 第${z.no}回・${esc(z.name)}</div>
    <h2>Q${i + 1}. ${esc(q.t)}</h2>
    <div class="body"><div class="qopts">${qz.opts[i].map((o, k) => {
      let cls = '';
      if (a) { if (o === correct) cls = 'right'; else if (o === a.pick) cls = 'wrong'; else cls = 'dim'; }
      return `<button class="qopt ${cls}" data-k="${k}" ${a ? 'disabled' : ''}><span class="mk">${'ABCD'[k]}</span><span>${esc(o)}</span></button>`;
    }).join('')}</div>
    ${a ? `<div class="${a.ok ? 'ok' : 'warn'}" style="font-size:15px;padding:10px 14px">${a.ok ? '⭕ 正解！' : '❌ 正解は「' + esc(correct) + '」'}</div>
      <div class="box" style="margin-top:10px">${esc(q.e)}<br><a href="#" class="qslide" style="color:var(--accent);font-weight:700;font-size:14px">スライド${q.s}枚目で復習する ›</a></div>` : ''}
    </div></div>`;
  $('svStage').scrollTop = 0;
  $('svStage').querySelectorAll('.qopt').forEach(b => b.onclick = () => {
    const pick = qz.opts[i][+b.dataset.k];
    qz.ans[i] = { pick, ok: pick === correct };
    drawQuiz();
  });
  const sl = $('svStage').querySelector('.qslide');
  if (sl) sl.onclick = e => { e.preventDefault(); svEl.dataset.mode = ''; goSlide(q.s - 1); };
  $('svPrev').disabled = i === 0; $('svPrev').style.opacity = i === 0 ? .4 : 1;
  $('svNext').disabled = !a; $('svNext').style.opacity = a ? 1 : .4;
  $('svNext').textContent = i === n - 1 ? '結果を見る' : '次へ ›';
}
function drawQuizResult() {
  const { z } = qz, n = z.q.length;
  const right = qz.ans.filter(a => a && a.ok).length, sc = right * 10;
  if (!qz.saved) {
    const r = quizRec(z.no);
    r.tries.push({ d: today(), sc }); if (r.tries.length > 20) r.tries.shift();
    r.best = Math.max(r.best ?? 0, sc); qz.saved = true; save();
  }
  const r = quizRec(z.no);
  const msg = sc === 100 ? '満点です！分析マップの考え方が身についています。' : sc >= 80 ? 'よくできました。まちがえた問題をスライドで復習しましょう。' : 'まちがえた問題のスライドを見直して、もう一度挑戦しましょう。';
  $('svStage').innerHTML = `<div class="sl">
    <div class="sec">確認テスト 第${z.no}回・${esc(z.name)}</div>
    <h2>結果</h2>
    <div class="body">
      <div class="target" style="margin:0 0 12px"><div class="k">あなたの点数</div><div class="v">${sc}点</div><div class="f">${right} / ${n}問 正解　（最高 ${r.best}点・${r.tries.length}回目）</div></div>
      <p>${msg}</p>
      ${z.q.map((q, k) => {
        const a = qz.ans[k];
        return `<div class="qres ${a && a.ok ? 'r' : 'w'}"><b>${a && a.ok ? '⭕' : '❌'} Q${k + 1}</b><span>${esc(q.t)}${a && a.ok ? '' : `<br><small>正解：${esc(q.a[0])}</small>`}</span>${a && a.ok ? '' : `<a href="#" data-s="${q.s}">スライド${q.s}</a>`}</div>`;
      }).join('')}
    </div></div>`;
  $('svStage').scrollTop = 0;
  $('svStage').querySelectorAll('[data-s]').forEach(x => x.onclick = e => { e.preventDefault(); svEl.dataset.mode = ''; goSlide(+x.dataset.s - 1); });
  $('svPrev').disabled = false; $('svPrev').style.opacity = 1; $('svPrev').textContent = 'もう一度';
  $('svNext').disabled = false; $('svNext').style.opacity = 1;
  $('svNext').textContent = z.no < QUIZ.length ? '第' + (z.no + 1) + '回へ ›' : 'おわる';
}

/* ── 学ぶタブ ───────────────────────────────── */
function slideNo() { return Math.min(Math.max(0, S.slide || 0), SLIDES.length - 1); }
function renderLearn() {
  const n = slideNo(), seen = Math.min(S.slideMax || 0, SLIDES.length);
  const chap = (sec) => `<a class="chip sm" href="${sec[0]}" target="_blank" rel="noopener">▶ ${sec[1]}</a>`;
  $('learnBody').innerHTML = `
    <div class="lhero">
      <h2>スライドで学ぶ</h2>
      <p>分析の考え方と、分析マップの書き方。全${SLIDES.length}枚・約10分。</p>
      <div class="pbar"><i style="width:${seen / SLIDES.length * 100}%"></i></div>
      <p style="margin:4px 0 12px;font-size:12px">${seen ? seen + ' / ' + SLIDES.length + ' 枚まで見ました' : 'まだ見ていません'}</p>
      <button class="btn" id="lStart">${n > 0 ? 'つづきから（' + (n + 1) + '枚目）' : 'はじめる'}</button>
      ${n > 0 ? '<button class="btn sm" id="lFirst" style="background:transparent;color:#fff;min-height:36px;margin-top:6px">最初から見る</button>' : ''}
    </div>
    ${quizCards()}
    <h3 style="margin:20px 0 4px">ヒラの動画</h3>
    <p class="mini" style="margin:0 0 6px">押すと動画が開きます。</p>
    ${vcard('use', '使い方', '分析マップの書き方を、上の段から順番に説明。まずはこれ。', [['https://youtu.be/xKcVUAVAkkQ?t=201', '取れた失点 3:21'], ['https://youtu.be/xKcVUAVAkkQ?t=396', 'なぜ？ 6:36'], ['https://youtu.be/xKcVUAVAkkQ?t=565', 'どうする？ 9:25']])}
    ${vcard('loom', 'KK率の追加（動画1本目）', '分析マップに「KK率」を追加した理由と、数字の出し方。')}
    ${vcard('kk', 'KK率の出し方と戦略立て（動画2本目）', '実際にKK率を出しながら、次の作戦の立て方まで。', [['https://youtu.be/U1NFZE84Yq8?t=182', '出し方 3:02'], ['https://youtu.be/U1NFZE84Yq8?t=476', '目安 7:56'], ['https://youtu.be/U1NFZE84Yq8?t=900', '作戦 15:00']])}
    ${vcard('bible', 'シークレット会6', 'テスト前・テスト中・テスト後の3つの柱。分析編は 2:02:09 から。', [['https://youtu.be/o1alKonFUig?t=7329', '分析編（分析マップの掟）2:02:09'], ['https://youtu.be/o1alKonFUig?t=604', 'テストマップの掟 10:03'], ['https://youtu.be/o1alKonFUig?t=3640', 'テストマニュアル 1:00:40'], ['https://youtu.be/o1alKonFUig?t=8256', 'まとめ 2:17:36']])}
    ${vcard('mind', 'マインド動画86', '分析とは何か。分解→タスク化→進捗管理の3ステップ。')}
    <p class="ver">分析マップ v${VER}</p>`;
  $('lStart').onclick = () => openSlides(slideNo());
  $('learnBody').querySelectorAll('[data-quiz]').forEach(b => b.onclick = () => openQuiz(+b.dataset.quiz));
  if ($('lFirst')) $('lFirst').onclick = () => openSlides(0);
}
function vcard(k, label, desc, chaps) {
  const v = VID[k];
  return `<div class="vcard">
    <a class="ic ${v.loom ? 'loom' : ''}" href="${vurl(k)}" target="_blank" rel="noopener" aria-label="動画を開く">▶</a>
    <div class="m">
      <a href="${vurl(k)}" target="_blank" rel="noopener" style="text-decoration:none;color:inherit;display:block">
        <div class="k">${esc(label)}・${v.kind}</div>
        <div class="t">${esc(v.name)}</div>
        <div class="d">${esc(desc)}</div>
      </a>
      ${chaps ? `<div class="chips">${chaps.map(c => `<a class="chip sm" href="${c[0]}" target="_blank" rel="noopener">▶ ${esc(c[1])}</a>`).join('')}</div>` : ''}
    </div>
  </div>`;
}

/* ── スライドを見る ─────────────────────────── */
let svEl = null, svI = 0;
function openSlides(i) {
  if (!svEl) {
    svEl = document.createElement('div'); svEl.className = 'sv';
    svEl.innerHTML = `
      <div class="top"><button class="iconbtn" id="svClose" aria-label="閉じる">✕</button><div class="c" id="svC"></div><span style="width:42px"></span></div>
      <div class="prog"><i id="svP"></i></div>
      <div class="stage" id="svStage"></div>
      <div class="nav"><button class="btn line" id="svPrev">‹ 前へ</button><button class="btn pri" id="svNext">次へ ›</button></div>`;
    document.body.append(svEl);
    $('svClose').onclick = closeSlides;
    $('svPrev').onclick = () => {
      if (svEl.dataset.mode === 'quiz') { if (qz.i >= qz.z.q.length) openQuiz(qz.z.no); else if (qz.i > 0) { qz.i--; drawQuiz(); } return; }
      goSlide(svI - 1);
    };
    $('svNext').onclick = () => {
      if (svEl.dataset.mode === 'quiz') {
        if (qz.i >= qz.z.q.length) { if (qz.z.no < QUIZ.length) openQuiz(qz.z.no + 1); else closeSlides(); return; }
        if (!qz.ans[qz.i]) return;
        qz.i++; drawQuiz(); return;
      }
      if (svI >= SLIDES.length - 1) { closeSlides(); toast('おつかれさまでした'); } else goSlide(svI + 1);
    };
    let x0 = null, y0 = null;
    const st = $('svStage');
    st.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    st.addEventListener('touchend', e => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      if (svEl.dataset.mode !== 'quiz' && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) goSlide(svI + (dx < 0 ? 1 : -1));
      x0 = null;
    }, { passive: true });
    document.addEventListener('keydown', e => {
      if (!svEl || svEl.hidden || svEl.dataset.mode === 'quiz') return;
      if (e.key === 'ArrowRight') goSlide(svI + 1);
      else if (e.key === 'ArrowLeft') goSlide(svI - 1);
      else if (e.key === 'Escape') closeSlides();
    });
  }
  svEl.hidden = false;
  document.body.style.overflow = 'hidden';
  goSlide(i);
}
function goSlide(i) {
  svI = Math.max(0, Math.min(i, SLIDES.length - 1));
  const s = SLIDES[svI];
  svEl.dataset.mode = '';
  $('svPrev').textContent = '‹ 前へ'; $('svNext').disabled = false; $('svNext').style.opacity = 1;
  S.slide = svI; S.slideMax = Math.max(S.slideMax || 0, svI + 1); save();
  $('svC').textContent = (svI + 1) + ' / ' + SLIDES.length;
  $('svP').style.width = ((svI + 1) / SLIDES.length * 100) + '%';
  $('svPrev').disabled = svI === 0; $('svPrev').style.opacity = svI === 0 ? .4 : 1;
  $('svNext').textContent = svI === SLIDES.length - 1 ? 'おわる' : '次へ ›';
  const src = (s.v || []).map(([k, t]) => `<a class="vlink" style="margin:0" href="${vurl(k, t)}" target="_blank" rel="noopener">▶ ${esc(VID[k].name)} ${hms(t)}</a>`).join('');
  $('svStage').innerHTML = `<div class="sl">
    <div class="sec">${esc(s.sec)}</div>
    <h2>${esc(s.t)}</h2>
    <div class="body">${s.h.replace('{N}', SLIDES.length)}</div>
    ${svI === SLIDES.length - 1 ? '<button class="btn pri wide" id="svMake" style="margin-top:8px">分析マップを作る</button>' : ''}
    ${src ? `<div class="src">${src}</div>` : ''}
  </div>`;
  $('svStage').scrollTop = 0;
  const gq = $('svStage').querySelector('[data-goquiz]'); if (gq) gq.onclick = () => openQuiz(+gq.dataset.goquiz);
  const mk = $('svMake'); if (mk) mk.onclick = () => { closeSlides(); show('home'); renderHome(); $('btnNew').click(); };
}
function closeSlides() {
  if (svEl) svEl.hidden = true;
  document.body.style.overflow = '';
  if (!$('learn').hidden) renderLearn();
}

/* タブの切りかえ */
document.querySelectorAll('#tabbar [data-tab]').forEach(b => b.onclick = () => {
  const t = b.dataset.tab;
  show(t);
  if (t === 'learn') renderLearn(); else renderHome();
});
show('home');
