import re

with open('services/recommendation_engine.js', 'r', encoding='utf-8') as f:
    content = f.read()

new_arrays = """
const MESSAGES = {
    fr: {
        INTROS: [
            "Psst {first_name}... 👀",
            "Hello {first_name} ! 🌿",
            "Hey {first_name}, devinez quoi ? 🔥",
            "Salut {first_name} ! Prêt pour une petite douceur ? 😋",
            "Juste pour vous, {first_name}... 🤫",
            "On pensait justement à vous, {first_name} ! ✨"
        ],
        BODY_NEW_CLIENT: [
            "Vous avez jeté un œil à <b>{product}</b> récemment... Et franchement, vous avez bon goût ! 👌",
            "On a vu que <b>{product}</b> vous faisait de l'œil. C'est le moment de craquer !",
            "Si vous cherchez la crème de la crème, ne cherchez pas plus loin que <b>{product}</b>."
        ],
        BODY_RETENTION: [
            "On sait que vous adorez <b>{product}</b>. Bonne nouvelle : il est en stock et n'attend que vous ! 🛒",
            "C'est bientôt l'heure de votre session habituelle... <b>{product}</b> est prêt à partir en livraison express ! 💨",
            "Votre variété favorite, <b>{product}</b>, vient tout juste d'être réapprovisionnée. Premier arrivé, premier servi ! 🏆"
        ],
        BODY_AGGRESSIVE: [
            "Ça fait un petit moment qu'on ne vous a pas vu ! Votre <b>{product}</b> préféré vous attend, on vous prépare ça ? 🎁",
            "Ne ratez pas notre stock de <b>{product}</b>, les autres clients se l'arrachent en ce moment ! ⏳"
        ],
        OUTROS: [
            "\\n\\n👇 Ouvrez la Mini App en un clic :",
            "\\n\\n👇 Faites-vous plaisir maintenant :",
            "\\n\\n👇 Commandez discrètement ici :"
        ],
        BTN: "🛍️ Ouvrir la Mini App"
    },
    en: {
        INTROS: [
            "Psst {first_name}... 👀",
            "Hello {first_name}! 🌿",
            "Hey {first_name}, guess what? 🔥",
            "Hi {first_name}! Ready for a little treat? 😋",
            "Just for you, {first_name}... 🤫",
            "We were just thinking about you, {first_name}! ✨"
        ],
        BODY_NEW_CLIENT: [
            "You took a look at <b>{product}</b> recently... And honestly, you have great taste! 👌",
            "We saw <b>{product}</b> caught your eye. Now's the time to go for it!",
            "If you're looking for the best of the best, look no further than <b>{product}</b>."
        ],
        BODY_RETENTION: [
            "We know you love <b>{product}</b>. Good news: it's in stock and waiting for you! 🛒",
            "It's almost time for your usual session... <b>{product}</b> is ready for express delivery! 💨",
            "Your favorite strain, <b>{product}</b>, has just been restocked. First come, first served! 🏆"
        ],
        BODY_AGGRESSIVE: [
            "It's been a while since we saw you! Your favorite <b>{product}</b> is waiting, shall we prepare it for you? 🎁",
            "Don't miss out on our stock of <b>{product}</b>, other customers are grabbing it right now! ⏳"
        ],
        OUTROS: [
            "\\n\\n👇 Open the Mini App in one click:",
            "\\n\\n👇 Treat yourself now:",
            "\\n\\n👇 Order discreetly here:"
        ],
        BTN: "🛍️ Open the Mini App"
    },
    es: {
        INTROS: [
            "Psst {first_name}... 👀",
            "¡Hola {first_name}! 🌿",
            "Hey {first_name}, ¿adivina qué? 🔥",
            "¡Hola {first_name}! ¿Listo para un capricho? 😋",
            "Solo para ti, {first_name}... 🤫",
            "¡Justo estábamos pensando en ti, {first_name}! ✨"
        ],
        BODY_NEW_CLIENT: [
            "Has echado un vistazo a <b>{product}</b> recientemente... ¡Y la verdad, tienes muy buen gusto! 👌",
            "Vimos que <b>{product}</b> te llamó la atención. ¡Es el momento de darse el capricho!",
            "Si buscas lo mejor de lo mejor, no busques más allá de <b>{product}</b>."
        ],
        BODY_RETENTION: [
            "Sabemos que te encanta <b>{product}</b>. Buenas noticias: ¡está en stock y te espera! 🛒",
            "Ya casi es hora de tu sesión habitual... ¡<b>{product}</b> está listo para entrega express! 💨",
            "Tu variedad favorita, <b>{product}</b>, acaba de ser reabastecida. ¡El primero en llegar se lo lleva! 🏆"
        ],
        BODY_AGGRESSIVE: [
            "¡Hace tiempo que no te vemos! Tu <b>{product}</b> favorito te espera, ¿te lo preparamos? 🎁",
            "¡No te pierdas nuestro stock de <b>{product}</b>, otros clientes se lo están llevando ahora mismo! ⏳"
        ],
        OUTROS: [
            "\\n\\n👇 Abre la Mini App en un clic:",
            "\\n\\n👇 Date un capricho ahora:",
            "\\n\\n👇 Pide discretamente aquí:"
        ],
        BTN: "🛍️ Abrir la Mini App"
    },
    de: {
        INTROS: [
            "Psst {first_name}... 👀",
            "Hallo {first_name}! 🌿",
            "Hey {first_name}, rate mal! 🔥",
            "Hi {first_name}! Bereit für eine kleine Freude? 😋",
            "Nur für dich, {first_name}... 🤫",
            "Wir haben gerade an dich gedacht, {first_name}! ✨"
        ],
        BODY_NEW_CLIENT: [
            "Du hast dir kürzlich <b>{product}</b> angesehen... Und ehrlich gesagt, du hast einen guten Geschmack! 👌",
            "Wir haben gesehen, dass <b>{product}</b> dir aufgefallen ist. Jetzt ist die Zeit, zuzugreifen!",
            "Wenn du nach dem Besten vom Besten suchst, such nicht weiter als <b>{product}</b>."
        ],
        BODY_RETENTION: [
            "Wir wissen, dass du <b>{product}</b> liebst. Gute Nachrichten: Es ist auf Lager und wartet auf dich! 🛒",
            "Es ist fast Zeit für deine übliche Session... <b>{product}</b> ist bereit für die Expresslieferung! 💨",
            "Deine Lieblingssorte, <b>{product}</b>, wurde gerade wieder aufgefüllt. Wer zuerst kommt, mahlt zuerst! 🏆"
        ],
        BODY_AGGRESSIVE: [
            "Es ist schon eine Weile her, seit wir dich gesehen haben! Dein Lieblings-<b>{product}</b> wartet, sollen wir es für dich vorbereiten? 🎁",
            "Verpasse nicht unseren Bestand an <b>{product}</b>, andere Kunden greifen gerade zu! ⏳"
        ],
        OUTROS: [
            "\\n\\n👇 Öffne die Mini-App mit einem Klick:",
            "\\n\\n👇 Gönn dir jetzt etwas:",
            "\\n\\n👇 Bestelle hier diskret:"
        ],
        BTN: "🛍️ Mini-App öffnen"
    }
};

function generateDynamicText(firstName, productName, type, lang = 'fr') {
    if (!MESSAGES[lang]) lang = 'fr';
    const m = MESSAGES[lang];
    const randomInt = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const intro = randomInt(m.INTROS).replace('{first_name}', firstName || 'l\\'ami');
    
    let bodyArr = m.BODY_NEW_CLIENT;
    if (type === 'retention') bodyArr = m.BODY_RETENTION;
    else if (type === 'retention_aggressive') bodyArr = m.BODY_AGGRESSIVE;
    
    const body = randomInt(bodyArr).replace('{product}', productName);
    const outro = randomInt(m.OUTROS);
    return `${intro}\\n\\n${body}${outro}`;
}

function getBtnText(lang = 'fr') {
    if (!MESSAGES[lang]) lang = 'fr';
    return MESSAGES[lang].BTN;
}
"""

# Replace the old arrays and generateDynamicText function
content = re.sub(r'const INTROS = \[[\s\S]*?function generateDynamicText\(firstName, productName, type\) \{[\s\S]*?return `\$\{intro\}\\n\\n\$\{body\}\$\{outro\}`;[\s\S]*?\}', new_arrays, content)

# Now we need to update runRecommendationEngine to fetch language and pass it.
# We'll use re.sub again.
content = content.replace("const message = generateDynamicText(firstName, topProduct, candidateType);", 
"""const userLang = uOrders.length > 0 ? (uOrders[0].language_code || 'fr') : 'fr';
                    const message = generateDynamicText(firstName, topProduct, candidateType, userLang);
                    const btnText = getBtnText(userLang);""")

content = content.replace("inline_keyboard: [[{ text: '🛍️ Ouvrir la Mini App', web_app:",
                          "inline_keyboard: [[{ text: btnText, web_app:")

with open('services/recommendation_engine.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated recommendation_engine.js")
