'use client';

import { useState } from 'react';
import AdminPanel from '@/components/AdminPanel';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'register' | 'admin'>('register');
  const [customerData, setCustomerData] = useState<any>(null);
  const [statusMsg, setStatusMsg] = useState('กรุณาเสียบบัตรประชาชนที่เครื่องอ่าน');
  const [isLoading, setIsLoading] = useState(false);
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [manualForm, setManualForm] = useState({ citizenId: '', title: '', firstName: '', lastName: '', address: '' });
  const [step, setStep] = useState(1);
  const [serviceType, setServiceType] = useState('');
  const [productType, setProductType] = useState('');
  const [productDetail, setProductDetail] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [phone, setPhone] = useState('');
  const [printMode, setPrintMode] = useState<'coupon' | 'attach' | 'full' | null>(null);
  const [customerJobs, setCustomerJobs] = useState<any[]>([]);
  const [isFetchingJobs, setIsFetchingJobs] = useState(false);
  const [searchJobId, setSearchJobId] = useState('');

  const readCard = async () => {
    setIsLoading(true);
    setStatusMsg('กำลังเชื่อมต่อเครื่องอ่านบัตร...');
    try {
      const response = await fetch('http://localhost:8081/api/read_card');
      const result = await response.json();
      
      if (result.success) {
        setCustomerData(result.data);
        setStatusMsg('อ่านบัตรสำเร็จ!');
      } else {
        setStatusMsg(result.message);
      }
    } catch (error) {
      setStatusMsg('ไม่สามารถเชื่อมต่อโปรแกรมอ่านบัตร (Agent) ได้ กรุณาเปิดโปรแกรม agent.py');
    }
    setIsLoading(false);
  };

  const handlePrint = (mode: 'coupon' | 'attach' | 'full') => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
      setPrintMode(null);
    }, 100);
  };
  
  const finishTransaction = () => {
    setActiveTab('register');
    setStep(1);
    setCustomerData(null);
    setServiceType('');
    setProductType('');
    setProductDetail('');
    setSymptoms('');
    setPhone('');
    setStatusMsg('กรุณาเสียบบัตรประชาชนที่เครื่องอ่าน');
  };

  const saveJob = async () => {
    try {
      const payload = {
        citizenId: customerData.citizenId,
        title: customerData.title,
        firstName: customerData.firstName,
        lastName: customerData.lastName,
        address: customerData.address,
        phone: phone,
        productType: productType,
        productDetail: productDetail,
        symptoms: symptoms
      };
      
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (data.success) {
        // อัปเดต customerData ให้มี jobId กลับมาเพื่อแสดงบนใบงาน
        setCustomerData({ ...customerData, jobId: data.job.jobId });
        setStep(4);
      } else {
        alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + data.message);
      }
    } catch (error) {
      alert('ไม่สามารถเชื่อมต่อฐานข้อมูลได้');
    }
  };

  const fetchCustomerJobs = async () => {
    setIsFetchingJobs(true);
    try {
      const res = await fetch(`/api/jobs?citizenId=${customerData.citizenId}`);
      const data = await res.json();
      if (data.success) {
        setCustomerJobs(data.jobs);
      }
    } catch (error) {
      alert('ไม่สามารถดึงข้อมูลรายการซ่อมได้');
    }
    setIsFetchingJobs(false);
  };

  const searchJobByCoupon = async () => {
    if (!searchJobId) return;
    setIsFetchingJobs(true);
    try {
      const res = await fetch(`/api/jobs/search?jobId=${searchJobId}`);
      const data = await res.json();
      if (data.success) {
        // แตกชื่อ นามสกุล จาก data.job.customer.name
        const nameParts = data.job.customer.name.split(' ');
        setCustomerData({
          citizenId: data.job.customer.citizenId,
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          address: data.job.customer.address,
          photo: null
        });
        
        setCustomerJobs([data.job]);
        setServiceType('return');
        setStep(3);
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert('ไม่สามารถดึงข้อมูลรายการซ่อมได้');
    }
    setIsFetchingJobs(false);
  };

  const returnItem = async (jobId: string) => {
    if (!confirm('ยืนยันการส่งคืนสิ่งของรายการนี้?')) return;
    try {
      const res = await fetch('/api/jobs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, status: 'RETURNED' })
      });
      const data = await res.json();
      if (data.success) {
        // อัปเดต state ทันที
        setCustomerJobs(jobs => jobs.map(j => j.jobId === jobId ? { ...j, status: 'RETURNED' } : j));
      } else {
        alert('เกิดข้อผิดพลาด: ' + data.message);
      }
    } catch (error) {
      alert('ไม่สามารถอัปเดตสถานะได้');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-blue-600 text-white shadow-md print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <button 
              onClick={finishTransaction}
              className="flex-shrink-0 font-bold text-xl hover:text-gray-200 transition-colors text-left"
            >
              ระบบลงทะเบียน Fix IT Center วิทยาลัยเทคนิคสัตหีบ
            </button>
            <div className="flex space-x-4">
              <button 
                onClick={() => {setActiveTab('register'); setStep(1);}}
                className={`px-3 py-2 rounded-md text-sm font-medium ${activeTab === 'register' ? 'bg-blue-700' : 'hover:bg-blue-500'}`}
              >
                ลงทะเบียนผู้ใช้บริการ
              </button>
              <button 
                onClick={() => {
                  if (activeTab === 'admin') return;
                  const password = prompt('กรุณากรอกรหัสผ่านเพื่อเข้าสู่โหมดผู้ดูแลระบบ:');
                  if (password === 'tatc') {
                    setActiveTab('admin');
                  } else if (password !== null) {
                    alert('รหัสผ่านไม่ถูกต้อง');
                  }
                }}
                className={`px-3 py-2 rounded-md text-sm font-medium ${activeTab === 'admin' ? 'bg-blue-700' : 'hover:bg-blue-500'}`}
              >
                จัดการฐานข้อมูล (Admin)
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {activeTab === 'register' ? (
          <div className="bg-white rounded-lg shadow p-6 print:shadow-none print:p-0">
            {step === 1 && (
              <>
                <h2 className="text-xl font-semibold mb-4 text-gray-800 print:hidden">หน้าต่างรอรับบัตรประชาชน</h2>
                {!customerData && !isManualEntry ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                    <div className="text-blue-500 mb-4">
                      <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                      </svg>
                    </div>
                    <p className="text-lg font-medium text-gray-900">{statusMsg}</p>
                    <div className="mt-6 flex justify-center gap-4">
                      <button 
                        onClick={readCard}
                        disabled={isLoading}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400"
                      >
                        {isLoading ? 'กำลังอ่าน...' : 'อ่านบัตรประชาชน'}
                      </button>
                      <button onClick={() => setIsManualEntry(true)} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded">
                        กรอกข้อมูลด้วยตนเอง
                      </button>
                    </div>
                    
                    <div className="mt-12 border-t pt-8 max-w-md mx-auto">
                      <h3 className="text-md font-medium text-gray-700 mb-4">หรือ ค้นหาจากคูปอง (มารับของคืน)</h3>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="กรอกรหัสคิวงาน เช่น FIX-0001" 
                          className="border p-2 rounded flex-grow text-black"
                          value={searchJobId}
                          onChange={e => setSearchJobId(e.target.value)}
                        />
                        <button 
                          onClick={searchJobByCoupon}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-bold"
                        >
                          ค้นหา
                        </button>
                      </div>
                    </div>
                  </div>
                ) : isManualEntry ? (
                  <div className="border border-gray-200 rounded-lg p-6 bg-gray-50 text-black">
                    <h3 className="text-lg font-medium border-b pb-2 mb-4 text-black">กรอกข้อมูลผู้มาใช้บริการ (กรณีไม่มีบัตร)</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm mb-1 text-gray-700">รหัสบัตรประชาชน (ถ้าจำได้)</label>
                        <input type="text" className="w-full border p-2 rounded" value={manualForm.citizenId} onChange={e => setManualForm({...manualForm, citizenId: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-sm mb-1 text-gray-700">คำนำหน้า</label>
                        <input type="text" className="w-full border p-2 rounded" value={manualForm.title} onChange={e => setManualForm({...manualForm, title: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-sm mb-1 text-gray-700">ชื่อ</label>
                        <input type="text" className="w-full border p-2 rounded" value={manualForm.firstName} onChange={e => setManualForm({...manualForm, firstName: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-sm mb-1 text-gray-700">นามสกุล</label>
                        <input type="text" className="w-full border p-2 rounded" value={manualForm.lastName} onChange={e => setManualForm({...manualForm, lastName: e.target.value})} />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm mb-1 text-gray-700">เบอร์โทรศัพท์ / ที่อยู่</label>
                        <input type="text" className="w-full border p-2 rounded" value={manualForm.address} onChange={e => setManualForm({...manualForm, address: e.target.value})} />
                      </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                      <button onClick={() => setIsManualEntry(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded">ยกเลิก</button>
                      <button onClick={() => {
                        setCustomerData({
                          citizenId: manualForm.citizenId || '-',
                          title: manualForm.title,
                          firstName: manualForm.firstName,
                          lastName: manualForm.lastName,
                          address: manualForm.address,
                          photo: null
                        });
                        setIsManualEntry(false);
                      }} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">บันทึกข้อมูล</button>
                    </div>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-lg p-6 bg-gray-50 flex gap-6">
                    {customerData.photo && (
                      <div className="flex-shrink-0">
                        <img 
                          src={customerData.photo} 
                          alt="รูปถ่ายบัตรประชาชน" 
                          className="w-32 h-36 object-cover border-2 border-gray-300 rounded shadow-sm"
                        />
                      </div>
                    )}
                    <div className="flex-grow">
                      <h3 className="text-lg font-medium border-b pb-2 mb-4 text-black">ข้อมูลผู้มาใช้บริการ</h3>
                      <div className="grid grid-cols-2 gap-4 text-black items-center">
                        <div><span className="font-semibold">รหัสบัตรประชาชน:</span> {customerData.citizenId}</div>
                        <div><span className="font-semibold">ชื่อ-สกุล:</span> {customerData.title}{customerData.firstName} {customerData.lastName}</div>
                        <div className="col-span-2"><span className="font-semibold">ที่อยู่:</span> {customerData.address}</div>
                        <div className="col-span-2 mt-2">
                          <span className="font-semibold">เบอร์โทรศัพท์:</span>
                          <input 
                            type="tel" 
                            className="border border-gray-300 rounded px-3 py-1 ml-3 text-black w-64 focus:ring-blue-500 focus:border-blue-500" 
                            placeholder="กรอกเบอร์โทรศัพท์ (เช่น 0812345678)" 
                            value={phone} 
                            onChange={e => setPhone(e.target.value)} 
                          />
                        </div>
                      </div>
                      <div className="mt-6 flex justify-end">
                        <button onClick={() => setCustomerData(null)} className="mr-4 text-gray-600 hover:text-gray-900">ยกเลิก</button>
                        <button onClick={() => setStep(2)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded">
                          ถัดไป (เลือกระบบ)
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {step === 2 && (
              <div className="text-center py-10">
                <h2 className="text-2xl font-bold mb-8 text-gray-800">กรุณาระบุบริการ</h2>
                <div className="flex justify-center gap-8">
                  <button 
                    onClick={() => { setServiceType('repair'); setStep(3); }}
                    className="bg-blue-500 hover:bg-blue-600 text-white p-10 rounded-lg shadow-lg flex flex-col items-center w-64"
                  >
                    <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    <span className="text-2xl font-bold">นำของมาส่งซ่อม</span>
                  </button>
                  <button 
                    onClick={() => { 
                      setServiceType('return'); 
                      setStep(3); 
                      fetchCustomerJobs();
                    }}
                    className="bg-green-500 hover:bg-green-600 text-white p-10 rounded-lg shadow-lg flex flex-col items-center w-64"
                  >
                    <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path></svg>
                    <span className="text-2xl font-bold">มารับของคืน</span>
                  </button>
                </div>
                <button onClick={() => setStep(1)} className="mt-8 text-gray-500 hover:text-gray-800">ย้อนกลับ</button>
              </div>
            )}

            {step === 3 && serviceType === 'repair' && (
              <div>
                <h2 className="text-xl font-bold mb-4 text-gray-800">ระบุรายละเอียดการส่งซ่อม</h2>
                <div className="bg-gray-50 p-6 rounded border space-y-4">
                  <div>
                    <label className="block font-medium text-gray-700 mb-1">ชนิดสิ่งของ (เลือกจากรายการ หรือพิมพ์เอง)</label>
                    <input 
                      type="text" 
                      list="popular-items"
                      className="w-full border-gray-300 rounded p-2 text-black border" 
                      placeholder="เช่น พัดลม, เตารีด" 
                      value={productType} 
                      onChange={(e) => setProductType(e.target.value)} 
                    />
                    <datalist id="popular-items">
                      <option value="พัดลม" />
                      <option value="เตารีด" />
                      <option value="หม้อหุงข้าว" />
                      <option value="กาต้มน้ำร้อน" />
                      <option value="ไดร์เป่าผม" />
                      <option value="เครื่องปั่นน้ำผลไม้" />
                      <option value="ไมโครเวฟ" />
                      <option value="โทรทัศน์ / ทีวี" />
                      <option value="วิทยุ / ลำโพง" />
                      <option value="คอมพิวเตอร์ / โน้ตบุ๊ก" />
                      <option value="ปลั๊กพ่วง / สายไฟ" />
                      <option value="โคมไฟ / หลอดไฟ" />
                    </datalist>
                  </div>
                  <div>
                    <label className="block font-medium text-gray-700 mb-1">รายละเอียดของที่นำมาซ่อม (ยี่ห้อ/รุ่น/สี/ลักษณะ)</label>
                    <input 
                      type="text" 
                      className="w-full border-gray-300 rounded p-2 text-black border" 
                      placeholder="เช่น Hatari 16 นิ้ว สีเขียว" 
                      value={productDetail} 
                      onChange={(e) => setProductDetail(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-gray-700 mb-1">อาการที่เสีย</label>
                    <textarea className="w-full border-gray-300 rounded p-2 text-black border" rows={3} placeholder="เช่น เปิดไม่ติด, ส่ายไม่ได้" value={symptoms} onChange={(e) => setSymptoms(e.target.value)}></textarea>
                  </div>
                </div>
                <div className="mt-6 flex justify-between">
                  <button onClick={() => setStep(2)} className="text-gray-500 hover:text-gray-800 px-4 py-2">ย้อนกลับ</button>
                  <button onClick={saveJob} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded">
                    บันทึกและออกใบรับงาน
                  </button>
                </div>
              </div>
            )}

            {step === 3 && serviceType === 'return' && (
              <div>
                <h2 className="text-xl font-bold mb-4 text-gray-800">รายการสิ่งของที่นำมาส่งซ่อม</h2>
                <div className="bg-white p-2 rounded border border-gray-200">
                  {isFetchingJobs ? (
                    <p className="text-center py-8 text-gray-500">กำลังดึงข้อมูล...</p>
                  ) : customerJobs.length === 0 ? (
                    <p className="text-center py-8 text-gray-500">ไม่พบประวัติการส่งซ่อมของลูกค้ารายนี้</p>
                  ) : (
                    <table className="min-w-full divide-y divide-gray-200 text-black">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">รหัสคิวงาน</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สิ่งของ</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะ</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">การจัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {customerJobs.map((job) => (
                          <tr key={job.jobId} className={job.status === 'RETURNED' ? 'bg-green-50' : ''}>
                            <td className="px-6 py-4 whitespace-nowrap font-medium">{job.jobId}</td>
                            <td className="px-6 py-4">{job.category?.name} {job.itemDetail}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {job.status === 'RETURNED' ? (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">รับคืนแล้ว</span>
                              ) : (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">กำลังซ่อม/รอมารับ</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              {job.status !== 'RETURNED' && (
                                <button 
                                  onClick={() => returnItem(job.jobId)}
                                  className="text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm font-medium"
                                >
                                  ส่งมอบคืนลูกค้า
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                <div className="mt-6 flex justify-between">
                  <button onClick={() => setStep(2)} className="text-gray-500 hover:text-gray-800 px-4 py-2">ย้อนกลับ</button>
                  <button onClick={finishTransaction} className="text-blue-600 underline px-4 py-2">จบการทำงาน</button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="print:m-0">
                <div className="print:hidden mb-4 border-b pb-4">
                  <h2 className="text-xl font-bold text-green-600 mb-4">บันทึกข้อมูลเรียบร้อยแล้ว</h2>
                  <div className="flex flex-wrap gap-4">
                    <button onClick={() => handlePrint('coupon')} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                      พิมพ์ใบคูปองซ่อม (58mm)
                    </button>
                    <button onClick={() => handlePrint('attach')} className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                      พิมพ์ใบส่งซ่อมแนบของ (58mm)
                    </button>
                    <button onClick={() => handlePrint('full')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                      พิมพ์ใบงานช่างฉบับเต็ม (A4)
                    </button>
                  </div>
                  <div className="mt-4 text-right">
                    <button onClick={finishTransaction} className="text-gray-500 hover:text-gray-700 underline">
                      เสร็จสิ้นการทำงาน (รับลูกค้าคิวต่อไป)
                    </button>
                  </div>
                </div>
                
                {/* ส่วนที่จะถูกพรินต์ออกมา */}
                <div className="text-black">
                  {/* คูปองลูกค้า */}
                  <div className={`border-2 border-dashed border-gray-400 p-6 rounded w-80 mx-auto ${printMode && printMode !== 'coupon' ? 'hidden print:hidden' : 'block mb-8'}`}>
                    <h1 className="text-xl font-bold text-center mb-2">ใบคูปองซ่อม (ลูกค้า)</h1>
                    <p className="text-center text-xs mb-4 border-b pb-4">ศูนย์ซ่อมสร้างเพื่อชุมชน (Fix IT Center)</p>
                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <div><span className="font-bold">รหัสคิวงาน:</span> {customerData?.jobId || 'กำลังออกรหัส...'}</div>
                      <div><span className="font-bold">ชื่อลูกค้า:</span> {customerData?.firstName} {customerData?.lastName}</div>
                      <div><span className="font-bold">วันที่ส่งซ่อม:</span> {new Date().toLocaleDateString('th-TH')}</div>
                      <div><span className="font-bold">สินค้าที่ซ่อม:</span> {productType} {productDetail}</div>
                    </div>
                  </div>

                  {/* ใบแนบสินค้า */}
                  <div className={`border-2 border-dashed border-gray-400 p-6 rounded w-80 mx-auto ${printMode && printMode !== 'attach' ? 'hidden print:hidden' : 'block mb-8'}`}>
                    <h1 className="text-xl font-bold text-center mb-2">ใบส่งซ่อม (แนบสิ่งของ)</h1>
                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <div><span className="font-bold">รหัสซ่อม:</span> {customerData?.jobId || 'กำลังออกรหัส...'}</div>
                      <div><span className="font-bold">สินค้าที่ซ่อม:</span> {productType} {productDetail}</div>
                      <div><span className="font-bold">อาการเสีย:</span> {symptoms}</div>
                      <div><span className="font-bold">ชื่อลูกค้า:</span> {customerData?.firstName} {customerData?.lastName}</div>
                    </div>
                  </div>

                  {/* ใบงานช่าง */}
                  <div className={`border-2 border-solid border-gray-800 p-6 rounded max-w-2xl mx-auto ${printMode && printMode !== 'full' ? 'hidden print:hidden' : 'block'}`}>
                    <h1 className="text-2xl font-bold text-center mb-6">ใบรับงานซ่อม (สำหรับช่าง)</h1>
                    <div className="flex gap-6">
                      {customerData?.photo && (
                        <div className="flex-shrink-0">
                          <img src={customerData.photo} className="w-32 h-40 object-cover border" alt="รูปถ่ายลูกค้า" />
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4 text-sm flex-grow">
                        <div><span className="font-bold">รหัสคิวงาน:</span> {customerData?.jobId || 'กำลังออกรหัส...'}</div>
                        <div><span className="font-bold">วันที่รับซ่อม:</span> {new Date().toLocaleDateString('th-TH')}</div>
                        <div className="col-span-2"><span className="font-bold">สินค้าที่ซ่อม:</span> {productType} {productDetail}</div>
                        <div className="col-span-2"><span className="font-bold">อาการเสีย:</span> {symptoms}</div>
                        <div className="col-span-2 border-t pt-2 mt-2"></div>
                        <div><span className="font-bold">ชื่อลูกค้า:</span> {customerData?.firstName} {customerData?.lastName}</div>
                        <div><span className="font-bold">รหัสประชาชน:</span> {customerData?.citizenId}</div>
                        <div className="col-span-2"><span className="font-bold">ที่อยู่:</span> {customerData?.address}</div>
                        <div className="col-span-2"><span className="font-bold">เบอร์โทรติดต่อ:</span> {phone || '.........................'}</div>
                      </div>
                    </div>
                    <div className="mt-8 border-t pt-4">
                      <p className="font-bold mb-4">ผลการประเมินการซ่อม (ส่วนของช่าง):</p>
                      <p className="mb-2">[ ] ซ่อมได้คุ้มค่า</p>
                      <p className="mb-2">[ ] ซ่อมไม่คุ้มค่า / อะไหล่แพงเกินไป</p>
                      <p>[ ] ส่งมอบของคืนลูกค้าแล้ว ลงชื่อ ......................................</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <AdminPanel />
        )}
      </main>
    </div>
  );
}
