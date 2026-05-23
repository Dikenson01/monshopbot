
        window.addEventListener('error', function(e) {
            var err = e.error ? e.error.stack : e.message;
            fetch('/api/log-error', { method: 'POST', headers: {'Content-Type':'application/json', 'ngrok-skip-browser-warning': '69420'}, body: JSON.stringify({error: err, type: 'error', ua: navigator.userAgent}) });
        });
        window.addEventListener('unhandledrejection', function(e) {
            fetch('/api/log-error', { method: 'POST', headers: {'Content-Type':'application/json', 'ngrok-skip-browser-warning': '69420'}, body: JSON.stringify({error: e.reason ? (e.reason.stack || e.reason) : 'Unknown', type: 'promise', ua: navigator.userAgent}) });
        });
    