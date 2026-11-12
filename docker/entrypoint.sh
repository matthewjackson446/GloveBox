#!/bin/sh
# Run as PUID:PGID (Unraid default 99:100 = nobody:users) so appdata files
# have the same ownership as every other container's.
set -e

PUID="${PUID:-99}"
PGID="${PGID:-100}"
umask "${UMASK:-022}"

if [ "$(id -u)" = "0" ]; then
	if ! getent group "$PGID" >/dev/null 2>&1; then
		addgroup -g "$PGID" glovebox
	fi
	GROUP_NAME="$(getent group "$PGID" | cut -d: -f1)"

	if ! getent passwd "$PUID" >/dev/null 2>&1; then
		adduser -D -H -u "$PUID" -G "$GROUP_NAME" -s /sbin/nologin glovebox
	fi

	mkdir -p "$DATA_DIR"
	chown -R "$PUID:$PGID" "$DATA_DIR"

	echo "[glovebox] starting as uid=$PUID gid=$PGID, data in $DATA_DIR"
	exec su-exec "$PUID:$PGID" "$@"
fi

exec "$@"
