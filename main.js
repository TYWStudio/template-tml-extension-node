'use strict';

const { TmlClient } = require('./tml');

const client = new TmlClient();

client.run(async (tml) => {
  tml.log('拓展示例已启动 (Node.js)', 'info');

  try {
    const info = await tml.hostInfo();
    tml.log('宿主信息: ' + JSON.stringify(info));
  } catch (e) {
    tml.log('获取宿主信息失败: ' + e.message, 'warn');
  }

  const accepted = await tml.subscribe(['launcher.started', 'game.launched', 'settings.changed']);
  tml.log('已订阅事件: ' + JSON.stringify(accepted));
  await tml.toast('你好，我是 TML 拓展示例！');

  tml.onEvent((type, data) => {
    tml.log('收到事件 ' + type + ': ' + JSON.stringify(data));
  });

  let count = (await tml.storageGet('launch_count')) || 0;
  count = parseInt(count, 10) || 0;
  count += 1;
  await tml.storageSet('launch_count', count);
  tml.log('历史触发次数: ' + count);

  await tml.settingsSet('ext.' + tml.extId + '.greeting', 'hello');
  const greeting = await tml.settingsGet('ext.' + tml.extId + '.greeting');
  tml.log('读取设置: ' + greeting);
});
