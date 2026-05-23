
        async function requestRestockAlert(pid) {
            const uid = tg.initDataUnsafe?.user?.id;
            if (!uid) return;
            try {
                tg.HapticFeedback.notificationOccurred('success');
                tg.showPopup({
                    title: t('restock_alert_title', "Alerte de Réapprovisionnement"),
                    message: t('restock_alert_msg', "Vous recevrez une notification Telegram dès que ce produit sera de nouveau en stock !"),
                    buttons: [{ type: "ok" }]
                });
                
                await fetch(`/api/products/${pid}/alert`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ telegramId: uid })
                });
                closeProductModal();
            } catch (e) {
                console.error('Error requesting alert:', e);
            }
        }
    