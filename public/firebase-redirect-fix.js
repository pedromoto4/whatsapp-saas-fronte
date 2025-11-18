// Script para redirecionar de volta para localhost quando estiver na página do Firebase
(function() {
  // Verifica se estamos no domínio do Firebase
  if (window.location.hostname.includes('firebaseapp.com')) {
    // Extrai os parâmetros da URL
    const urlParams = new URLSearchParams(window.location.search);
    const state = urlParams.get('state');
    const code = urlParams.get('code');
    
    // Se tiver os parâmetros de auth, redireciona para localhost com eles
    if (state && code) {
      const redirectUrl = 'http://localhost:5173/login?' + window.location.search;
      console.log('Redirecionando para:', redirectUrl);
      window.location.href = redirectUrl;
    } else {
      // Se não tiver parâmetros, só redireciona para localhost
      window.location.href = 'http://localhost:5173/login';
    }
  }
})();

