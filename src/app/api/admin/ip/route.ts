import { NextResponse } from 'next/server';
import os from 'os';

export async function GET() {
  const interfaces = os.networkInterfaces();
  let localIp = '';

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        localIp = iface.address;
        if (localIp.startsWith('192.168.') || localIp.startsWith('10.')) {
            break;
        }
      }
    }
  }

  if (!localIp) {
    localIp = 'localhost';
  }

  return NextResponse.json({ ip: localIp });
}
