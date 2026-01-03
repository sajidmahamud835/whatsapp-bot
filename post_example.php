 <?php
    $number = '8801304854562@c.us';
    $mediaUrl = 'https://www.w3schools.com/w3css/img_lights.jpg';
    $caption = 'This is a test caption';
    $mediaType = 'image';
    $clientId = 1;
    $data = [
        'number' => $number,
        'mediaUrl' => $mediaUrl,
        'caption' => $caption,
        'mediaType' => $mediaType
    ];
    $url = 'https://wa.sanamedia.net/' . $clientId . '/sendMedia';
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    $headers = array();
    $headers[] = 'Content-Type: application/json';
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    $result = curl_exec($ch);
    if (curl_errno($ch)) {
        echo 'Error:' . curl_error($ch);
    }
    curl_close($ch);
    echo $result;
?>