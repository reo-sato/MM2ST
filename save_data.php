<?php
header('Content-Type: application/json');
$input = file_get_contents('php://input');
$data = json_decode($input, true);
$save_dir = 'data/';
if (!is_dir($save_dir)) {
  mkdir($save_dir, 0777, true);
}
$filename = $save_dir . basename($data['filename']) . "_" . date("Ymd_His") . ".csv";
$filedata = $data['filedata'];
if (file_put_contents($filename, $filedata)) {
  echo json_encode(['status' => 'success']);
} else {
  echo json_encode(['status' => 'error']);
}
?>
