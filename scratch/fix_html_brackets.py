import os

views_dir = 'web/views'
html_files = [f for f in os.listdir(views_dir) if f.endswith('.html')]

for filename in html_files:
    filepath = os.path.join(views_dir, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix the double >>
    content = content.replace('>>Shop<', '>Shop<')
    content = content.replace('>>BaaS<', '>BaaS<')
    content = content.replace('>>Suivi<', '>Suivi<')
    content = content.replace('>>Profil<', '>Profil<')
    content = content.replace('>>Passer la commande<', '>Passer la commande<')
    content = content.replace('>>Panier<', '>Panier<')
    content = content.replace('>>Adresse de livraison<', '>Adresse de livraison<')
    content = content.replace(">>Confirmer l'adresse<", ">Confirmer l'adresse<")
    content = content.replace('>>Tableau de bord<', '>Tableau de bord<')
    content = content.replace('>>Paramètres<', '>Paramètres<')
    content = content.replace('>>Historique<', '>Historique<')
    content = content.replace('>>Ma Boutique<', '>Ma Boutique<')
    content = content.replace('>>Ajouter au panier<', '>Ajouter au panier<')
    content = content.replace('>>Livreur<', '>Livreur<')
    content = content.replace('>>Retour<', '>Retour<')
    content = content.replace('>>Annuler<', '>Annuler<')
    content = content.replace('>>Confirmer<', '>Confirmer<')
    content = content.replace('>>Oui<', '>Oui<')
    content = content.replace('>>Non<', '>Non<')
    content = content.replace('>>Livraison<', '>Livraison<')
    content = content.replace('>>Retrait<', '>Retrait<')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("HTML brackets fixed!")
