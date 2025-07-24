// Example external usage (in your project code)
const fetch = require('node-fetch');
const secret = process.env.VSCODE_API_KEY;

(async () => {
  const res = await fetch('http://localhost:8282/command', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-vscode-key': secret
    },
    body: JSON.stringify({
      command: 'editor.action.insertLineAfter',
      args: []
    })
  });

  if (res.ok) {
    const { result } = await res.json();
    console.log('✅ Command executed:', result);
  } else {
    console.error('❌ Failed:', await res.text());
  }
})();
