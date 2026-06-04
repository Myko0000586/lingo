/* ============================================================
   КОНТЕНТ КУРСА  (уровень A2–B1)
   Чтобы добавить слова/уроки — просто дополняй массивы ниже.
   ============================================================ */

/* ---- ТЕМЫ (для иконок и фильтра) ---- */
const TOPICS = {
  home:   {title:'Дом и быт',     emoji:'🏠', color:'#58cc02'},
  hockey: {title:'Хоккей',        emoji:'🏒', color:'#1cb0f6'},
  school: {title:'Школа',         emoji:'🎒', color:'#ce82ff'},
  food:   {title:'Еда',           emoji:'🍎', color:'#ff9600'},
  travel: {title:'Путешествия',   emoji:'✈️', color:'#ff4b4b'},
  grammar:{title:'Грамматика',    emoji:'📚', color:'#2b70c9'},
};

/* ---- СЛОВАРЬ ----
   [id, en, ru, пример-предложение, тема]
   Слова автоматически попадают в карточки, когда пройден урок. */
const VOCAB_RAW = [
  // --- Дом и быт ---
  ['kitchen','kitchen','кухня','I cook breakfast in the kitchen.','home'],
  ['bedroom','bedroom','спальня','My bedroom is small but cozy.','home'],
  ['clean','to clean','убирать / чистить','I clean the house on Sundays.','home'],
  ['wash','to wash','мыть / стирать','She washes the dishes after dinner.','home'],
  ['fridge','fridge','холодильник','The milk is in the fridge.','home'],
  ['towel','towel','полотенце','Can you give me a clean towel?','home'],
  ['turn_on','to turn on','включать','Please turn on the light.','home'],
  ['turn_off','to turn off','выключать','Turn off the TV before you sleep.','home'],
  ['rubbish','rubbish','мусор','Take out the rubbish, please.','home'],
  ['neighbour','neighbour','сосед','Our neighbour is very friendly.','home'],
  ['key','key','ключ','I lost my keys this morning.','home'],
  ['repair','to repair','чинить','He can repair the broken chair.','home'],
  ['blanket','blanket','одеяло','It is cold, take a blanket.','home'],
  ['vacuum','to vacuum','пылесосить','I vacuum the carpet every week.','home'],

  // --- Хоккей ---
  ['puck','puck','шайба','The player shot the puck into the net.','hockey'],
  ['stick','stick','клюшка','He broke his stick during the game.','hockey'],
  ['goal','goal','гол / ворота','She scored a beautiful goal.','hockey'],
  ['goalie','goalie','вратарь','The goalie saved the last shot.','hockey'],
  ['rink','rink','каток','We practise at the ice rink.','hockey'],
  ['skate','to skate','кататься на коньках','My son learns to skate.','hockey'],
  ['team','team','команда','Our team won the match.','hockey'],
  ['coach','coach','тренер','The coach is very strict.','hockey'],
  ['score','to score','забивать','He scored twice tonight.','hockey'],
  ['pass','to pass','пасовать','Pass the puck to me!','hockey'],
  ['helmet','helmet','шлем','Always wear your helmet.','hockey'],
  ['period','period','период','They scored in the third period.','hockey'],

  // --- Школа ---
  ['lesson','lesson','урок','The English lesson starts at nine.','school'],
  ['homework','homework','домашнее задание','I do my homework in the evening.','school'],
  ['teacher','teacher','учитель','Our teacher explains very well.','school'],
  ['pupil','pupil','ученик','Every pupil has a notebook.','school'],
  ['subject','subject','предмет','Maths is my favourite subject.','school'],
  ['exam','exam','экзамен','She passed the exam easily.','school'],
  ['mark','mark','оценка','He got a good mark in history.','school'],
  ['answer','to answer','отвечать','Please answer the question.','school'],
  ['ask','to ask','спрашивать','Can I ask you something?','school'],
  ['learn','to learn','учить / узнавать','We learn new words every day.','school'],
  ['mistake','mistake','ошибка','Everyone makes mistakes.','school'],
  ['break','break','перемена','Let us meet during the break.','school'],

  // --- Еда ---
  ['breakfast','breakfast','завтрак','I have eggs for breakfast.','food'],
  ['dinner','dinner','ужин','We had dinner at a restaurant.','food'],
  ['bread','bread','хлеб','Buy some fresh bread, please.','food'],
  ['vegetable','vegetable','овощ','Vegetables are good for you.','food'],
  ['tasty','tasty','вкусный','This soup is really tasty.','food'],
  ['order','to order','заказывать','I would like to order a pizza.','food'],
  ['spicy','spicy','острый','The food is too spicy for me.','food'],
  ['recipe','recipe','рецепт','She shared her recipe with me.','food'],
  ['fry','to fry','жарить','Fry the onions for five minutes.','food'],
  ['bill','bill','счёт','Could we have the bill, please?','food'],

  // --- Путешествия ---
  ['ticket','ticket','билет','I bought a ticket to London.','travel'],
  ['luggage','luggage','багаж','My luggage is very heavy.','travel'],
  ['flight','flight','рейс / полёт','The flight was delayed.','travel'],
  ['airport','airport','аэропорт','We arrived at the airport early.','travel'],
  ['hotel','hotel','отель','The hotel is near the beach.','travel'],
  ['book_v','to book','бронировать','I booked a room for two nights.','travel'],
  ['map','map','карта','Let me check the map.','travel'],
  ['abroad','abroad','за границей','They travel abroad every summer.','travel'],
  ['delay','delay','задержка','There was a long delay.','travel'],
  ['suitcase','suitcase','чемодан','Pack your suitcase tonight.','travel'],
];

const VOCAB = {};
VOCAB_RAW.forEach(([id,en,ru,ex,topic]) => { VOCAB[id] = {id,en,ru,ex,topic}; });

/* ---- УРОКИ ПО ТЕМАМ ----
   Типы заданий: choice / listen / match / build / info
   words: какие слова словаря «выучиваются» (уйдут в карточки) после урока */
const THEMES = [
  {
    topic:'home', title:'Дом и быт',
    lessons:[
      { words:['kitchen','bedroom','fridge','towel','clean','wash'],
        items:[
          {type:'match', q:'Соедини пары', pairs:[['кухня','kitchen'],['спальня','bedroom'],['холодильник','fridge'],['полотенце','towel']]},
          {type:'choice', q:'Выбери перевод: «убирать»', a:'to clean', options:['to clean','to cook','to wash','to repair']},
          {type:'listen', q:'Что ты услышал?', a:'wash', options:['wash','watch','wish','wash']},
          {type:'build', q:'Переведи: «Я мою посуду»', a:'I wash the dishes', words:['I','wash','the','dishes','clean','am']},
          {type:'choice', q:'«The milk is in the …» (молоко в …)', a:'fridge', options:['fridge','towel','kitchen','key']},
        ]},
      { words:['turn_on','turn_off','rubbish','neighbour','key','repair'],
        items:[
          {type:'match', q:'Соедини пары', pairs:[['включать','turn on'],['выключать','turn off'],['мусор','rubbish'],['сосед','neighbour']]},
          {type:'build', q:'Переведи: «Пожалуйста, выключи свет»', a:'please turn off the light', words:['please','turn','off','the','light','on']},
          {type:'choice', q:'Выбери перевод: «чинить»', a:'to repair', options:['to repair','to clean','to wash','to vacuum']},
          {type:'listen', q:'Что ты услышал?', a:'key', options:['key','kid','key','car']},
          {type:'build', q:'Переведи: «Я потеряла ключи»', a:'I lost my keys', words:['I','lost','my','keys','the','found']},
        ]},
    ]
  },
  {
    topic:'hockey', title:'Хоккей',
    lessons:[
      { words:['puck','stick','goal','goalie','rink','skate'],
        items:[
          {type:'match', q:'Соедини пары', pairs:[['шайба','puck'],['клюшка','stick'],['вратарь','goalie'],['каток','rink']]},
          {type:'choice', q:'Выбери перевод: «забить гол»', a:'to score a goal', options:['to score a goal','to lose a goal','to skate fast','to pass a puck']},
          {type:'listen', q:'Что ты услышал?', a:'skate', options:['skate','state','skate','skip']},
          {type:'build', q:'Переведи: «Вратарь поймал шайбу»', a:'the goalie caught the puck', words:['the','goalie','caught','the','puck','goal']},
          {type:'choice', q:'«We practise at the ice …»', a:'rink', options:['rink','team','stick','goal']},
        ]},
      { words:['team','coach','score','pass','helmet','period'],
        items:[
          {type:'match', q:'Соедини пары', pairs:[['команда','team'],['тренер','coach'],['шлем','helmet'],['период','period']]},
          {type:'build', q:'Переведи: «Наша команда выиграла»', a:'our team won', words:['our','team','won','lost','the','a']},
          {type:'choice', q:'Выбери перевод: «пасовать»', a:'to pass', options:['to pass','to score','to skate','to coach']},
          {type:'listen', q:'Что ты услышал?', a:'coach', options:['coach','catch','coach','couch']},
          {type:'build', q:'Переведи: «Всегда надевай шлем»', a:'always wear your helmet', words:['always','wear','your','helmet','the','put']},
        ]},
    ]
  },
  {
    topic:'school', title:'Школа',
    lessons:[
      { words:['lesson','homework','teacher','pupil','subject','exam'],
        items:[
          {type:'match', q:'Соедини пары', pairs:[['урок','lesson'],['учитель','teacher'],['предмет','subject'],['экзамен','exam']]},
          {type:'choice', q:'Выбери перевод: «домашнее задание»', a:'homework', options:['homework','classroom','timetable','exam']},
          {type:'listen', q:'Что ты услышал?', a:'exam', options:['exam','exit','exam','example']},
          {type:'build', q:'Переведи: «Я делаю домашнее задание»', a:'I do my homework', words:['I','do','my','homework','make','the']},
          {type:'choice', q:'«Maths is my favourite …»', a:'subject', options:['subject','pupil','mark','break']},
        ]},
      { words:['mark','answer','ask','learn','mistake','break'],
        items:[
          {type:'match', q:'Соедини пары', pairs:[['оценка','mark'],['ошибка','mistake'],['перемена','break'],['учить','learn']]},
          {type:'build', q:'Переведи: «Пожалуйста, ответь на вопрос»', a:'please answer the question', words:['please','answer','the','question','ask','a']},
          {type:'choice', q:'Выбери перевод: «делать ошибки»', a:'to make mistakes', options:['to make mistakes','to ask questions','to learn words','to get marks']},
          {type:'listen', q:'Что ты услышал?', a:'learn', options:['learn','line','learn','lamp']},
          {type:'build', q:'Переведи: «Мы учим новые слова»', a:'we learn new words', words:['we','learn','new','words','study','old']},
        ]},
    ]
  },
  {
    topic:'food', title:'Еда',
    lessons:[
      { words:['breakfast','dinner','bread','vegetable','tasty','order','spicy','bill'],
        items:[
          {type:'match', q:'Соедини пары', pairs:[['завтрак','breakfast'],['ужин','dinner'],['хлеб','bread'],['овощ','vegetable']]},
          {type:'choice', q:'Выбери перевод: «вкусный»', a:'tasty', options:['tasty','spicy','fresh','cheap']},
          {type:'build', q:'Переведи: «Я хочу заказать пиццу»', a:'I would like to order a pizza', words:['I','would','like','to','order','a','pizza']},
          {type:'listen', q:'Что ты услышал?', a:'spicy', options:['spicy','spider','spicy','space']},
          {type:'build', q:'Переведи: «Можно счёт, пожалуйста?»', a:'could we have the bill please', words:['could','we','have','the','bill','please','menu']},
        ]},
    ]
  },
  {
    topic:'travel', title:'Путешествия',
    lessons:[
      { words:['ticket','luggage','flight','airport','hotel','book_v','map','abroad','delay','suitcase'],
        items:[
          {type:'match', q:'Соедини пары', pairs:[['билет','ticket'],['рейс','flight'],['аэропорт','airport'],['отель','hotel']]},
          {type:'choice', q:'Выбери перевод: «бронировать»', a:'to book', options:['to book','to buy','to pack','to fly']},
          {type:'build', q:'Переведи: «Мой багаж очень тяжёлый»', a:'my luggage is very heavy', words:['my','luggage','is','very','heavy','light']},
          {type:'listen', q:'Что ты услышал?', a:'flight', options:['flight','fight','flight','fright']},
          {type:'build', q:'Переведи: «Рейс задержали»', a:'the flight was delayed', words:['the','flight','was','delayed','is','late']},
        ]},
    ]
  },
];

/* ---- ГРАММАТИКА (объяснение + практика) ---- */
const GRAMMAR = [
  {
    topic:'grammar', title:'Present Simple — настоящее простое',
    lessons:[
      { words:[],
        items:[
          {type:'info', title:'Present Simple', html:
            'Используем для <b>привычек, фактов и расписаний</b>.<br><br>'+
            '<b>I / you / we / they</b> → глагол без изменений: <i>I work</i>, <i>they play</i>.<br>'+
            '<b>he / she / it</b> → добавляем <b>-s</b>: <i>he work<b>s</b></i>, <i>she play<b>s</b></i>.<br><br>'+
            'Отрицание: <i>I <b>do not (don\'t)</b> work</i> · <i>she <b>does not (doesn\'t)</b> work</i>.<br>'+
            'Вопрос: <i><b>Do</b> you work?</i> · <i><b>Does</b> she work?</i>'},
          {type:'choice', q:'She ___ in a hospital.', a:'works', options:['works','work','working','is work']},
          {type:'choice', q:'They ___ football every Sunday.', a:'play', options:['play','plays','playing','to play']},
          {type:'choice', q:'Отрицание: «Он не любит кофе»', a:"he doesn't like coffee", options:["he doesn't like coffee","he don't like coffee","he not like coffee","he isn't like coffee"]},
          {type:'build', q:'Собери вопрос: «Ты говоришь по-английски?»', a:'do you speak english', words:['do','you','speak','english','does','are']},
          {type:'choice', q:'My brother ___ TV in the evening.', a:'watches', options:['watches','watch','watchs','watching']},
        ]},
    ]
  },
  {
    topic:'grammar', title:'Past Simple — прошедшее простое',
    lessons:[
      { words:[],
        items:[
          {type:'info', title:'Past Simple', html:
            'Используем для <b>завершённых действий в прошлом</b> (вчера, год назад…).<br><br>'+
            'Правильные глаголы → <b>-ed</b>: <i>work → work<b>ed</b></i>, <i>play → play<b>ed</b></i>.<br>'+
            'Неправильные глаголы надо учить: <i>go → <b>went</b></i>, <i>see → <b>saw</b></i>, <i>have → <b>had</b></i>.<br><br>'+
            'Отрицание/вопрос через <b>did</b> (глагол снова в начальной форме!):<br>'+
            '<i>I <b>didn\'t</b> go</i> · <i><b>Did</b> you go?</i>'},
          {type:'choice', q:'Yesterday I ___ to the cinema.', a:'went', options:['went','go','goed','gone']},
          {type:'choice', q:'She ___ a new car last week.', a:'bought', options:['bought','buyed','buy','buys']},
          {type:'build', q:'Собери: «Они вчера не работали»', a:"they didn't work yesterday", words:["they","didn't","work","yesterday","worked","not"]},
          {type:'choice', q:'Вопрос: «Ты видел фильм?»', a:'did you see the film', options:['did you see the film','did you saw the film','do you see the film','you saw the film']},
          {type:'listen', q:'Что ты услышал?', a:'watched', options:['watched','washed','watched','wanted']},
        ]},
    ]
  },
  {
    topic:'grammar', title:'Артикли a / an / the',
    lessons:[
      { words:[],
        items:[
          {type:'info', title:'a / an / the', html:
            '<b>a / an</b> — неопределённый артикль, для <b>одного, любого</b> предмета (когда говорим впервые).<br>'+
            '<b>a</b> перед согласным звуком: <i>a dog</i>; <b>an</b> перед гласным: <i>an apple</i>.<br><br>'+
            '<b>the</b> — определённый, когда <b>понятно, о чём речь</b> (уже упоминали / единственный).<br>'+
            '<i>I have <b>a</b> cat. <b>The</b> cat is black.</i>'},
          {type:'choice', q:'I saw ___ elephant at the zoo.', a:'an', options:['an','a','the','-']},
          {type:'choice', q:'She is ___ teacher.', a:'a', options:['a','an','the','-']},
          {type:'choice', q:'Please close ___ door. (та самая дверь)', a:'the', options:['the','a','an','-']},
          {type:'build', q:'Собери: «Это яблоко. Яблоко красное.»', a:'this is an apple the apple is red', words:['this','is','an','apple','the','apple','is','red']},
        ]},
    ]
  },
  {
    topic:'grammar', title:'Present Continuous — сейчас',
    lessons:[
      { words:[],
        items:[
          {type:'info', title:'Present Continuous', html:
            'Используем для действий <b>прямо сейчас</b> или в текущий период.<br><br>'+
            'Формула: <b>am / is / are + глагол-ing</b>.<br>'+
            '<i>I <b>am</b> read<b>ing</b></i> · <i>she <b>is</b> cook<b>ing</b></i> · <i>they <b>are</b> play<b>ing</b></i>.<br><br>'+
            'Часто со словами <i>now, at the moment, today</i>.'},
          {type:'choice', q:'Look! The baby ___ .', a:'is sleeping', options:['is sleeping','sleeps','sleep','sleeping']},
          {type:'choice', q:'We ___ dinner right now.', a:'are having', options:['are having','have','having','has']},
          {type:'build', q:'Собери: «Я сейчас смотрю телевизор»', a:'I am watching tv now', words:['I','am','watching','tv','now','watch']},
          {type:'choice', q:'What ___ you ___ ? (что ты делаешь?)', a:'are / doing', options:['are / doing','do / do','is / doing','are / do']},
        ]},
    ]
  },
];

/* ---- ЗАДАНИЯ НА ПИСЬМО (для ИИ-учителя) ----
   level: 'A2' или 'B1' */
const WRITING_PROMPTS = [
  {topic:'home',   level:'A2', ru:'Опиши свою кухню: что в ней есть и что ты там делаешь (2–3 предложения).', hint:'Use: kitchen, fridge, cook, clean'},
  {topic:'home',   level:'B1', ru:'Расскажи, как ты обычно убираешь квартиру по выходным.', hint:'Past/Present Simple, 3–4 предложения'},
  {topic:'hockey', level:'A2', ru:'Напиши о хоккейном матче: кто играл и кто забил гол.', hint:'Use: team, score, goal, win'},
  {topic:'hockey', level:'B1', ru:'Опиши своего любимого хоккеиста и почему он тебе нравится.', hint:'because, the best, he plays...'},
  {topic:'school', level:'A2', ru:'Напиши про свой любимый школьный предмет и почему он нравится.', hint:'Use: subject, teacher, because'},
  {topic:'school', level:'B1', ru:'Расскажи, как прошёл твой вчерашний учебный день.', hint:'Past Simple, 4–5 предложений'},
  {topic:'food',   level:'A2', ru:'Опиши, что ты обычно ешь на завтрак.', hint:'Use: breakfast, bread, tasty, have'},
  {topic:'food',   level:'B1', ru:'Закажи ужин в ресторане — напиши диалог с официантом (3–4 реплики).', hint:'I would like..., Could we have the bill?'},
  {topic:'travel', level:'A2', ru:'Напиши, куда ты хочешь поехать в отпуск и почему.', hint:'Use: travel, hotel, because, want'},
  {topic:'travel', level:'B1', ru:'Расскажи о своём последнем путешествии: куда, с кем, что понравилось.', hint:'Past Simple, 4–5 предложений'},
];
