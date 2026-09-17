const crypto = require('crypto');

// Vérifie un mot de passe via l'API k-anonymity Have I Been Pwned (gratuite, sans clé API).
// Seuls les 5 premiers caractères du hash SHA-1 sont envoyés — le mot de passe en clair
// ne quitte jamais le serveur. En cas d'échec réseau, on "fail open" pour ne pas bloquer
// l'inscription/connexion sur une indisponibilité externe.
async function isPasswordPwned(password) {
  const sha1 = crypto.createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      signal: controller.signal,
      headers: { 'Add-Padding': 'true' }
    });
    clearTimeout(timeout);
    if (!response.ok) return { pwned: false, count: 0, checked: false };

    const text = await response.text();
    const match = text.split('\r\n').find(line => line.startsWith(suffix));
    if (!match) return { pwned: false, count: 0, checked: true };

    const count = parseInt(match.split(':')[1], 10) || 0;
    return { pwned: count > 0, count, checked: true };
  } catch {
    return { pwned: false, count: 0, checked: false };
  }
}

module.exports = { isPasswordPwned };
