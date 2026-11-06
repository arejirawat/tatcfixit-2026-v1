import type { NextConfig } from "next";
import os from "os";
import { execSync } from "child_process";
import pkg from "./package.json";

// ข้อมูลเวอร์ชันสำหรับแสดงท้ายหน้าเว็บ (ใช้ตรวจว่าเครื่องนี้รันโค้ดชุดไหน)
// - เลขเวอร์ชันมาจาก "version" ใน package.json (แก้ทุกครั้งที่ออกเวอร์ชันใหม่ พร้อมบันทึกใน CHANGELOG.md)
// - รหัส commit/วันที่ มาจาก git ถ้ามีไฟล์ที่แก้แต่ยังไม่ commit จะมีเครื่องหมาย * ต่อท้าย
const git = (cmd: string) => {
  try {
    return execSync(`git ${cmd}`, { cwd: __dirname, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "";
  }
};
const gitCommit = git("rev-parse --short HEAD");
const gitDirty = gitCommit && git("status --porcelain --untracked-files=no") ? "*" : "";
const gitDate = git("log -1 --format=%cd --date=format:%d/%m/%Y");

// ดึง IP ในวง LAN ทั้งหมดเพื่ออนุญาตให้เข้าถึง dev server ได้ (แก้ปัญหา Next.js 16 บล็อก)
const getLanIps = () => {
  const ips = ['localhost'];
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]!) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
};

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    APP_VERSION: pkg.version,
    APP_COMMIT: gitCommit ? `${gitCommit}${gitDirty}` : "",
    APP_COMMIT_DATE: gitDate,
  },
  allowedDevOrigins: getLanIps(),
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
