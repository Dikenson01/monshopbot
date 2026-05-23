function t() {}
const ctx = { reply: () => {} };
ctx.reply(t(ctx, 'msg_vous_n_tes_pas_enco', "❌ Vous n\'êtes pas encore abonné au canal. Veuillez cliquer sur \"Rejoindre le Canal\" puis réessayer."), { parse_mode: 'HTML' });
