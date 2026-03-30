import { parseXMLTVFromString } from './utils/epgParser';

const xmlData = `<?xml version="1.0" encoding="UTF-8"?>
<tv generator-info-name="Xtream Codes" generator-info-url="http://xtream-codes.com/">
  <channel id="1">
    <display-name>Channel 1</display-name>
  </channel>
  <programme start="20230501120000 +0000" stop="20230501130000 +0000" channel="1">
    <title>Program 1</title>
    <desc>Desc 1</desc>
  </programme>
</tv>`;

const data = parseXMLTVFromString(xmlData);
console.log(data);
