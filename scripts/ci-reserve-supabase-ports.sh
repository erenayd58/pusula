#!/usr/bin/env bash
# CI runner'ında Supabase'in host portlarını (supabase/config.toml) geçici port
# havuzundan çıkarır. Linux'ta ephemeral aralık 32768–60999'dur; docker pull /
# pnpm install gibi giden bağlantılar rastgele 54322'yi alınca `supabase start`
# "address already in use" ile düşüyordu. Port zaten doluysa sahibini yazıp çıkar.
set -euo pipefail

CONFIG="$(dirname "$0")/../supabase/config.toml"
PORTS=$(grep -E '^\s*(shadow_)?port\s*=' "$CONFIG" | grep -oE '[0-9]+' | sort -un)

echo "Ayrılan Supabase portları: $(echo "$PORTS" | tr '\n' ' ')"
sudo sysctl -q -w net.ipv4.ip_local_reserved_ports="$(echo "$PORTS" | paste -sd,)"

BUSY=0
for port in $PORTS; do
  if ss -Hltnp "sport = :$port" | grep -q .; then
    echo "::error::Port $port zaten kullanımda:"
    ss -ltnp "sport = :$port"
    BUSY=1
  fi
done
exit $BUSY
