import re

# LIVREUR
with open('web/views/livreur.html', 'r', encoding='utf-8') as f:
    liv = f.read()

reps_liv = [
    ("Dernier échange (${count}/6) :", "${t('dernier_echange', 'Dernier échange')} (${count}/6) :"),
    ("Discussion entamée (${count}/6)", "${t('discussion_entamee', 'Discussion entamée')} (${count}/6)"),
    ("APPROCHE CLIENT :", "${t('approche_client', 'APPROCHE CLIENT :')}"),
    ("✅ MARQUER LIVRÉ", "✅ ${t('marquer_livre', 'MARQUER LIVRÉ')}"),
    ("🗺 NAVIGUER", "🗺 ${t('naviguer', 'NAVIGUER')}"),
    ("💬 CHAT (${count}/6)", "💬 ${t('chat', 'CHAT')} (${count}/6)"),
    ("⚠️ REMETTRE", "⚠️ ${t('remettre', 'REMETTRE')}"),
    ("🚩 ANNULER", "🚩 ${t('annuler', 'ANNULER')}"),
    ("MESSAGERIE ANONYME :", "${t('messagerie_anonyme', 'MESSAGERIE ANONYME :')}"),
    ('placeholder="Votre message au client..."', 'placeholder="${t(\'msg_to_client\', \'Votre message au client...\')}"'),
    ('placeholder="Message au client..."', 'placeholder="${t(\'msg_to_client\', \'Message au client...\')}"'),
    (">ENVOYER<", ">${t('envoyer', 'ENVOYER')}<"),
    ("Le client verra ce message sans connaître votre numéro.", "${t('le_client_verra', 'Le client verra ce message sans connaître votre numéro.')}"),
    ("📦 ACCEPTER LA COURSE", "📦 ${t('accepter_la_course', 'ACCEPTER LA COURSE')}"),
    ("> Commande #", "> ${t('commande', 'Commande')} #"),
    ("Aucun message échangé (${count}/6)", "${t('aucun_message', 'Aucun message échangé')} (${count}/6)"),
    ("TOTAL ENCAISSÉ", "${t('total_encaisse', 'TOTAL ENCAISSÉ')}"),
    ('"Confirmer la livraison de cette commande ?"', 't("confirmer_livraison", "Confirmer la livraison de cette commande ?")'),
    ('"Remettre cette livraison dans la file d\'attente globale ?"', 't("confirmer_remettre", "Remettre cette livraison dans la file d\'attente globale ?")'),
    ('"Annuler définitivement cette commande (incident/stock indisponible) ?"', 't("confirmer_annuler", "Annuler définitivement cette commande (incident/stock indisponible) ?")'),
    ('"Confirmer l\'action ?"', 't("confirmer_action", "Confirmer l\'action ?")')
]

for old, new in reps_liv:
    liv = liv.replace(old, new)

with open('web/views/livreur.html', 'w', encoding='utf-8') as f:
    f.write(liv)

# CATALOG
with open('web/views/catalog.html', 'r', encoding='utf-8') as f:
    cat = f.read()

reps_cat = [
    ('.innerText = "RECAPITULATIF";', '.innerText = t("summary", "RECAPITULATIF");'),
    ('.innerText = "VALIDER LA COMMANDE";', '.innerText = t("validate_order", "VALIDER LA COMMANDE");'),
    ('SOUVENT ACHETÉ AVEC', '${t("frequently_bought_with", "SOUVENT ACHETÉ AVEC")}'),
    ('+ RECOMMANDÉ', '+ ${t("recommended", "RECOMMANDÉ")}'),
    ('LES FORMULES RECOMMANDÉES', '${t("recommended_formulas", "LES FORMULES RECOMMANDÉES")}'),
    ('.innerText = "PAYER LA COMMANDE";', '.innerText = t("pay_order", "PAYER LA COMMANDE");'),
    ('.innerText = "FINALISER L\'ACHAT";', '.innerText = t("finalize_purchase", "FINALISER L\'ACHAT");')
]

for old, new in reps_cat:
    cat = cat.replace(old, new)

with open('web/views/catalog.html', 'w', encoding='utf-8') as f:
    f.write(cat)

