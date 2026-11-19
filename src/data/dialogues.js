// 本地分支对白。{词} 会显示方言释义。
// node: { text: string | string[]（多页，逐页“继续”）, options?: [{ label, next, action?, after? }] }
// action: 选中时立即执行；after: 对话关闭后执行。没有 options 的节点在读完后显示“回见”。
// entry(s): s = { visits, flags } 决定开场节点，从而支持再次拜访时的变化。

export const DIALOGUES = {
  jianbing: {
    name: '王师傅', title: '煎饼摊主',
    entry: (s) => s.flags.boughtJianbing ? 'again' : (s.visits > 0 ? 'hello2' : 'hello'),
    nodes: {
      hello: {
        text: '来套煎饼果子？您了要{馃箅儿}还是油条？刚出锅的，{倍儿}香！',
        options: [{ label: '来一套！', next: 'choose' }, { label: '您忙嘛呢', next: 'busy' }, { label: '回见', next: 'bye' }],
      },
      hello2: {
        text: '又转回来啦？闻着味儿来的吧？来一套尝尝？',
        options: [{ label: '来一套！', next: 'choose' }, { label: '问个路', next: 'road' }, { label: '回见', next: 'bye' }],
      },
      choose: {
        text: '得嘞！您了要{馃箅儿}的还是油条的？',
        options: [
          { label: '油条的', next: 'youtiao', action: 'buy:youtiao' },
          { label: '馃箅儿的', next: 'guobi', action: 'buy:guobi' },
          { label: '我再想想', next: 'think' },
        ],
      },
      think: { text: '想好了再说，不着急。我这鏊子一直热着，嘛时候来都{赶趟儿}。' },
      youtiao: {
        text: ['油条的，好嘞！面糊一摊，鸡蛋一磕，葱花儿一撒，酱给您刷匀喽——', '油条往里一裹，{齐活}！拿好喽，趁热吃，软乎乎的，倍儿香。'],
        options: [{ label: '聊聊天津', next: 'tianjin' }, { label: '回见', next: 'byeEat' }],
      },
      guobi: {
        text: ['{馃箅儿}的？您了是懂行的！', '绿豆面儿的煎饼，裹上刚炸的馃箅儿，咬一口——嘎嘣脆！天津人就认这一口儿。'],
        options: [{ label: '聊聊天津', next: 'tianjin' }, { label: '回见', next: 'byeEat' }],
      },
      again: {
        text: '又来啦？吃得怎么样？没吃饱再给您摊一套，加俩鸡蛋！',
        options: [{ label: '再来一套', next: 'choose2' }, { label: '问个路', next: 'road' }, { label: '回见', next: 'bye' }],
      },
      choose2: {
        text: '还来？您了这是吃上瘾了！这回要嘛的？',
        options: [
          { label: '油条的', next: 'youtiao2', action: 'buy:youtiao' },
          { label: '馃箅儿的', next: 'guobi2', action: 'buy:guobi' },
          { label: '不了，饱了', next: 'full' },
        ],
      },
      youtiao2: { text: '得，还是油条的。这套算我请……嗐，{逗闷子}呢，咱这儿本来就不收钱。拿好！' },
      guobi2: { text: '馃箅儿的再来一套！您了这口味儿，比我们老街坊还地道。' },
      full: { text: '饱了好，饱了就溜达溜达，消消食儿。' },
      busy: {
        text: '忙嘛？摊煎饼呗！一早上少说一百多套。手上不能停，嘴上也不能闲着，跟街坊们{逗闷子}，一早上就过去了。',
        options: [{ label: '聊聊天津', next: 'tianjin' }, { label: '来一套！', next: 'choose' }, { label: '回见', next: 'bye' }],
      },
      tianjin: {
        text: '天津人早上讲究吃口热乎的：煎饼果子、老豆腐、{嘎巴菜}……换着样儿吃，一礼拜都不带重样儿的。',
        options: [{ label: '问个路', next: 'road' }, { label: '回见', next: 'bye' }],
      },
      road: {
        text: '往北一拐就是海河边儿。顺着河沿儿往东走到头儿，能瞧见天津之眼。我这儿走不开，您了自个儿溜达去吧！',
        options: [{ label: '得嘞，谢谢您', next: 'bye' }],
      },
      bye: { text: '回见您了！下回还上我这儿来！' },
      byeEat: { text: '慢点儿吃，别烫着！回见！' },
    },
  },

  fisher: {
    name: '老马大爷', title: '钓鱼的大爷',
    entry: (s) => s.visits > 0 ? 'again' : 'hello',
    nodes: {
      hello: {
        text: ['嘘——小点儿声，鱼听着呢。', '……逗你玩儿呢。钓没钓着另说，出来待会儿，多舒坦。'],
        options: [{ label: '钓着嘛了？', next: 'catch' }, { label: '聊聊天津', next: 'tianjin' }, { label: '回见', next: 'bye' }],
      },
      catch: {
        text: '钓着嘛？上午上来一条小{白漂子}，巴掌大，又给放回去了。钓鱼钓的是个心情，又不是为了吃。',
        options: [{ label: '那您天天来？', next: 'daily' }, { label: '回见', next: 'bye' }],
      },
      daily: {
        text: '风雨无阻——下雨除外。在家老伴儿嫌我碍事，我上这儿来，她清净，我舒坦，两全其美。',
        options: [{ label: '哈哈，有道理', next: 'bye2' }],
      },
      bye2: { text: '这叫过日子的学问。去吧去吧，前边儿还有好玩儿的。' },
      tianjin: {
        text: '海河，是天津的根儿。早先河上全是船，码头上倍儿热闹。现在嘛，热闹换了个样儿——你瞧东边儿那天津之眼，一亮灯，好看着呢。',
        options: [{ label: '观景点在哪儿？', next: 'where' }, { label: '回见', next: 'bye' }],
      },
      where: {
        text: '顺着河沿儿往东，过了小桥一直走到头儿，有个望远镜。你凑上去瞅一眼，没准儿能赶上它亮灯。',
        options: [{ label: '谢谢大爷', next: 'bye' }],
      },
      again: {
        text: '又是你啊。你瞧，浮漂儿刚才动了一下——又不动了。哈哈，不着急，鱼也得歇会儿。',
        options: [{ label: '钓着嘛了？', next: 'catch2' }, { label: '聊聊天津', next: 'tianjin' }, { label: '回见', next: 'bye' }],
      },
      catch2: {
        text: '还没呢。刚才过去一条大的，我瞅见它了，它也瞅见我了，谁都没吭声。',
        options: [{ label: '回见', next: 'bye' }],
      },
      bye: { text: '回见。走道儿看着点儿脚底下，别学我，光顾着看水。' },
    },
  },

  guide: {
    name: '小李姐', title: '热心指路的姐姐',
    entry: (s) => s.visits > 0 ? 'again' : 'hello',
    nodes: {
      hello: {
        text: '哎，{您了}是头回来吧？瞅您东张西望的。嘛去呀？我给您指个道儿！',
        options: [{ label: '问个路', next: 'road' }, { label: '您忙嘛呢', next: 'busy' }, { label: '回见', next: 'bye' }],
      },
      road: {
        text: '您了想上哪儿？',
        options: [{ label: '海河边儿', next: 'river' }, { label: '天津之眼', next: 'eye' }, { label: '吃早点', next: 'food' }],
      },
      river: {
        text: '您了顺着这条道儿走，前边儿就是海河。河沿儿上有风，凉快！',
        options: [{ label: '还想问别的', next: 'road' }, { label: '回见', next: 'bye' }],
      },
      eye: {
        text: '天津之眼啊？到了河边儿往东拐，一直走到头儿，有个观景台，那块儿瞧得最清楚。',
        options: [{ label: '还想问别的', next: 'road' }, { label: '回见', next: 'bye' }],
      },
      food: {
        text: '早点？这条街往北走到头儿，街角儿那个煎饼摊儿，王师傅的手艺，倍儿地道！就说是我让您去的。',
        options: [{ label: '还想问别的', next: 'road' }, { label: '回见', next: 'bye' }],
      },
      busy: {
        text: '我啊？下班儿溜达溜达，顺便消消食儿。在家待着{腻歪}，出来走两步，碰上谁都能聊两句。',
        options: [{ label: '聊聊天津', next: 'tianjin' }, { label: '回见', next: 'bye' }],
      },
      tianjin: {
        text: '天津人就这样儿，热心肠，爱{逗闷子}。您了在街上问个路，没准儿能给您讲半小时——路没指明白，相声先听了一段儿。',
        options: [{ label: '哈哈，还真是', next: 'laugh' }, { label: '回见', next: 'bye' }],
      },
      laugh: { text: '可不是嘛！就跟我现在似的。行了行了，不耽误您了，玩儿好啊！' },
      again: {
        text: '又碰上啦！找着地方没？没找着我再给您指一遍，不收费！',
        options: [{ label: '问个路', next: 'road' }, { label: '聊聊天津', next: 'tianjin' }, { label: '回见', next: 'bye' }],
      },
      bye: { text: '回见您了！有事儿再喊我！' },
    },
  },

  kuaiban: {
    name: '张大爷', title: '练快板的大爷',
    entry: (s) => s.visits > 0 ? 'again' : 'hello',
    nodes: {
      hello: {
        text: '哎——竹板这么一打呀，别的咱不夸……您了，听一段儿不？',
        options: [{ label: '来一段儿！', next: 'perform1', action: 'perform' }, { label: '您忙嘛呢', next: 'busy' }, { label: '回见', next: 'bye' }],
      },
      perform1: {
        text: ['（竹板儿打起来了——哒哒哒，哒哒哒）', '竹板这么一打呀，咱夸一夸天津卫——', '海河水，弯又长，天津之眼放光芒；小洋楼，一排排，红砖白墙真气派；', '煎饼果子{馃箅儿}脆，早上来套倍儿得味儿！'],
        options: [{ label: '倍儿哏儿！', next: 'praise' }, { label: '再来一段儿', next: 'perform2', action: 'perform' }],
      },
      praise: { text: '有眼光！我这快板儿，听过的都说{哏儿}。明儿还在这儿，您了再来！' },
      perform2: {
        text: ['说天津，道天津，天津人儿实在亲：', '问个路，带您走；聊两句，交朋友；', '您要嫌我嘴太碎——嘿！那您也得听完了再走！'],
        options: [{ label: '好！（鼓掌）', next: 'praise2' }, { label: '回见', next: 'bye' }],
      },
      praise2: { text: '谢谢您了！这段儿是新编的，头回说给外人听，您了算首演观众！' },
      busy: {
        text: '练活儿呢！岁数大了，嘴皮子得常练，一天不练就生。街坊们爱听，我就爱说。',
        options: [{ label: '聊聊天津', next: 'tianjin' }, { label: '来一段儿！', next: 'perform1', action: 'perform' }, { label: '回见', next: 'bye' }],
      },
      tianjin: {
        text: '天津是曲艺窝子：相声、快板、时调、大鼓……茶馆儿里一坐，能乐一下午。天津人说话，本身就带{包袱儿}。',
        options: [{ label: '包袱儿是嘛？', next: 'baofu' }, { label: '回见', next: 'bye' }],
      },
      baofu: {
        text: '包袱儿就是笑料！我这一说，您一乐，这包袱儿就算抖响了。您刚才乐了吧？那就是响了！',
        options: [{ label: '哈哈，响了', next: 'bye' }],
      },
      again: {
        text: '又来了？正好，我新编了两句，您了给把把关？',
        options: [{ label: '来吧！', next: 'perform2', action: 'perform' }, { label: '您忙嘛呢', next: 'busy' }, { label: '回见', next: 'bye' }],
      },
      bye: { text: '回见！走道儿带点儿节奏——嘀嗒嘀嗒，倍儿精神！' },
    },
  },

  resident: {
    name: '赵阿姨', title: '长椅上歇脚的阿姨',
    entry: (s) => s.visits > 0 ? 'again' : 'hello',
    nodes: {
      hello: {
        text: '{嘛去呀}？坐会儿，今儿这天气多好。',
        options: [{ label: '坐会儿', next: 'sit', after: 'sitNearby' }, { label: '您忙嘛呢', next: 'busy' }, { label: '回见', next: 'bye' }],
      },
      sit: { text: '这就对了。走累了就歇会儿，着嘛急呀。你瞧这河，看一下午都看不腻。' },
      busy: {
        text: '我忙嘛？我这叫“闲着”。闲着可比忙着难，得会闲。早上买菜，晌午做饭，下午就上这儿来，看看河，看看人。',
        options: [{ label: '聊聊天津', next: 'tianjin' }, { label: '回见', next: 'bye' }],
      },
      tianjin: {
        text: '天津这地方，不大不小，过日子正好。吃得好，说话{哏儿}，人也实在。你在这儿待长了，保准儿也张嘴就是“嘛”。',
        options: [{ label: '我已经会了', next: 'learn' }, { label: '回见', next: 'bye' }],
      },
      learn: { text: '是吗？来，说一句我听听——“嘛去呀？”……对喽，就是这个味儿！' },
      again: {
        text: '又溜达回来啦？天津小，转两圈儿就都认识了。坐会儿不？',
        options: [{ label: '坐会儿', next: 'sit', after: 'sitNearby' }, { label: '聊聊天津', next: 'tianjin' }, { label: '回见', next: 'bye' }],
      },
      bye: { text: '回见啊，慢点儿走！' },
    },
  },

  birdman: {
    name: '周大爷', title: '遛鸟的大爷',
    entry: (s) => ['h0', 'h1', 'h2'][s.visits % 3],
    nodes: {
      h0: { text: '您好！瞧我这鸟儿，今儿嗓子倍儿亮。', options: [{ label: '回见', next: 'bye' }] },
      h1: { text: '嘛去呀？溜达着呢？我也溜达着呢，咱俩一样。', options: [{ label: '回见', next: 'bye' }] },
      h2: { text: '这鸟儿跟了我十年了，比我还认道儿。', options: [{ label: '回见', next: 'bye' }] },
      bye: { text: '回见您了！' },
    },
  },
}
