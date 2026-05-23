
        document.addEventListener("DOMContentLoaded", () => {
            const bust = "?v=" + Date.now();
            document.querySelectorAll('.app-dynamic-logo').forEach(img => {
                if (img.src && img.src.includes('bot_media/mini_app_logo.png') && !img.src.includes('?v=')) {
                    img.src = img.src + bust;
                }
            });
        });
        
        function updateAppLogo(url) {
            if (!url) return;
            document.querySelectorAll('.app-dynamic-logo').forEach(img => {
                img.src = url;
            });
        }
    