#!/bin/bash
# fix.sh — Remove accountUuid + companion from ~/.claude.json
# Run this after a forced re-login overwrites your accountUuid.
# Then restart Claude Code and run /buddy to re-hatch.

CONFIG="$HOME/.claude.json"

if [ ! -f "$CONFIG" ]; then
  echo "Error: $CONFIG not found"
  exit 1
fi

echo "Before:"
node -e "
  const c = JSON.parse(require('fs').readFileSync('$CONFIG'));
  console.log('  accountUuid:', c.oauthAccount?.accountUuid ?? '(none)');
  console.log('  companion:', c.companion?.name ?? '(none)');
"

node -e "
  const f = '$CONFIG';
  const c = JSON.parse(require('fs').readFileSync(f));
  if (c.oauthAccount?.accountUuid) delete c.oauthAccount.accountUuid;
  if (c.companion) delete c.companion;
  require('fs').writeFileSync(f, JSON.stringify(c, null, 2));
"

echo ""
echo "After:"
node -e "
  const c = JSON.parse(require('fs').readFileSync('$CONFIG'));
  console.log('  accountUuid:', c.oauthAccount?.accountUuid ?? '(none)');
  console.log('  companion:', c.companion?.name ?? '(none)');
"

echo ""
echo "Done. Now restart Claude Code and run /buddy."
