#!/usr/bin/env bash
set -Eeuo pipefail

readonly domain='html.liaofan.us.ci'
readonly site_root='/var/www/html-review'
readonly release_tag="${1:?Usage: oracle-setup.sh vX.Y.Z}"

if [[ ! "$release_tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$ ]]; then
  echo 'Invalid release tag.' >&2
  exit 2
fi

command -v nginx >/dev/null
command -v certbot >/dev/null
command -v curl >/dev/null

install -d -m 0755 "$site_root/releases"

cat > /usr/local/sbin/html-review-deploy <<'DEPLOY_SCRIPT'
#!/usr/bin/env bash
set -Eeuo pipefail

readonly repository='ywainzh/Html-Review'
readonly site_root='/var/www/html-review'
readonly release_tag="${1:?Usage: html-review-deploy vX.Y.Z}"

if [[ ! "$release_tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$ ]]; then
  echo 'Invalid release tag.' >&2
  exit 2
fi

temporary_directory="$(mktemp -d "$site_root/.incoming.XXXXXX")"
trap 'rm -rf "$temporary_directory"' EXIT

archive_url="https://github.com/$repository/releases/download/$release_tag/html-review.tar.gz"
curl --fail --location --silent --show-error --retry 3 \
  "$archive_url" -o "$temporary_directory/release.tar.gz"
tar -xzf "$temporary_directory/release.tar.gz" -C "$temporary_directory"
test -s "$temporary_directory/index.html"

release_directory="$site_root/releases/$release_tag"
if [[ -e "$release_directory" ]]; then
  echo "Release already exists: $release_tag" >&2
  exit 1
fi

rm "$temporary_directory/release.tar.gz"
mv "$temporary_directory" "$release_directory"
trap - EXIT
ln -sfn "$release_directory" "$site_root/current.next"
mv -Tf "$site_root/current.next" "$site_root/current"
DEPLOY_SCRIPT
chmod 0755 /usr/local/sbin/html-review-deploy

cat > /etc/nginx/sites-available/html-review <<NGINX_SITE
server {
    listen 80;
    listen [::]:80;
    server_name $domain;
    root $site_root/current;
    index index.html;

    location /assets/ {
        try_files \$uri =404;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files \$uri \$uri/ /index.html;
        add_header Cache-Control "no-cache";
    }
}
NGINX_SITE

ln -sfn /etc/nginx/sites-available/html-review /etc/nginx/sites-enabled/html-review
/usr/local/sbin/html-review-deploy "$release_tag"
nginx -t
systemctl reload nginx
certbot --nginx --non-interactive --agree-tos --register-unsafely-without-email \
  --redirect --domain "$domain"
