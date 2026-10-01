<?php
/* ===========================================================
   Tafolli Glass — quote form handler
   Receives the form from index.html and mails it to TO_ADDRESS.
   Needs a host that runs PHP (DreamHost does; GitHub Pages does not).
   The page falls back to the visitor's mail client if this fails.
   =========================================================== */

declare(strict_types=1);

const TO_ADDRESS = 'info@tafolliglass.com';
const SITE_NAME  = 'Tafolli Glass';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function fail(string $why, int $code = 400) {
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $why], JSON_UNESCAPED_UNICODE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    fail('method', 405);
}

/* Honeypot: the form has a hidden "company" field no person ever sees.
   Anything filled in there is a bot, so accept quietly and drop it. */
if (trim((string)($_POST['company'] ?? '')) !== '') {
    echo json_encode(['ok' => true]);
    exit;
}

$clean = static function (string $key, int $max = 2000): string {
    $v = trim((string)($_POST[$key] ?? ''));
    $v = str_replace(["\r", "\0"], '', $v);
    return mb_substr($v, 0, $max);
};
/* Header fields must not carry newlines, or they can be used to inject
   extra mail headers. */
$header_safe = static fn(string $v): string => trim(preg_replace('/[\r\n]+/', ' ', $v) ?? '');

$name    = $clean('name', 120);
$phone   = $clean('phone', 60);
$email   = $clean('email', 160);
$product = $clean('productLabel', 120);
$message = $clean('message', 4000);
$lang    = preg_replace('/[^a-z]/', '', strtolower($clean('lang', 5))) ?: 'sq';

if ($name === '' || $phone === '') {
    fail('missing');
}
$replyTo = ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL)) ? $email : '';

$subject = sprintf('[%s] %s — %s', strtoupper($lang), SITE_NAME, $header_safe($name));

$body = implode("\n", [
    'Emri / Name:      ' . $name,
    'Telefoni / Phone: ' . $phone,
    'Email:            ' . ($email !== '' ? $email : '—'),
    'Produkti:         ' . ($product !== '' ? $product : '—'),
    'Gjuha / Language: ' . strtoupper($lang),
    '',
    'Mesazhi / Message:',
    $message !== '' ? $message : '—',
    '',
    str_repeat('-', 48),
    'Dërguar nga ' . ($_SERVER['HTTP_HOST'] ?? 'the website') . ' më ' . date('Y-m-d H:i'),
    'IP: ' . ($_SERVER['REMOTE_ADDR'] ?? '?'),
]);

$headers = [
    'From: ' . SITE_NAME . ' <no-reply@' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . '>',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Mailer: PHP/' . phpversion(),
];
if ($replyTo !== '') {
    $headers[] = 'Reply-To: ' . $header_safe($name) . ' <' . $replyTo . '>';
}

$sent = @mail(
    TO_ADDRESS,
    '=?UTF-8?B?' . base64_encode($subject) . '?=',
    $body,
    implode("\r\n", $headers)
);

if (!$sent) {
    fail('send', 500);
}

echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
