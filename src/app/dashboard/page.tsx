'use client';

import { useState, useEffect } from 'react';
import AdminPanel from '@/components/AdminPanel';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'register' | 'admin'>('register');
  const [centerName, setCenterName] = useState('วิทยาลัยเทคนิคสัตหีบ');
  const [contactPhone, setContactPhone] = useState('038-xxx-xxx');
  const [customerData, setCustomerData] = useState<any>(null);
  const [statusMsg, setStatusMsg] = useState('กรุณาเสียบบัตรประชาชนที่เครื่องอ่าน');
  const [isLoading, setIsLoading] = useState(false);
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [manualForm, setManualForm] = useState({ citizenId: '', title: '', firstName: '', lastName: '', address: '' });
  const [step, setStep] = useState(1);
  const [serviceType, setServiceType] = useState('');
  const [productType, setProductType] = useState('');
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [productDetail, setProductDetail] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [phone, setPhone] = useState('');
  const [printMode, setPrintMode] = useState<'coupon' | 'attach' | 'full' | null>(null);
  const [customerJobs, setCustomerJobs] = useState<any[]>([]);
  const [isFetchingJobs, setIsFetchingJobs] = useState(false);
  const [searchJobId, setSearchJobId] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/admin/settings');
        const data = await res.json();
        if (data.success) {
          data.settings.forEach((s: any) => {
            if (s.key === 'CENTER_NAME') setCenterName(s.value);
            if (s.key === 'CONTACT_PHONE') setContactPhone(s.value);
          });
        }

        const catRes = await fetch('/api/categories');
        const catData = await catRes.json();
        if (catData.success) {
          setCategories(catData.categories);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchSettings();
  }, [activeTab]);

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
        
        if (productType && !categories.find(c => c.name === productType.trim())) {
          setCategories(prev => [...prev, { id: 'new-' + Date.now(), name: productType.trim() }]);
        }
        
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
                      {categories.filter(c => !['พัดลม', 'เตารีด', 'หม้อหุงข้าว', 'กาต้มน้ำร้อน', 'ไดร์เป่าผม', 'เครื่องปั่นน้ำผลไม้', 'ไมโครเวฟ', 'โทรทัศน์ / ทีวี', 'วิทยุ / ลำโพง', 'คอมพิวเตอร์ / โน้ตบุ๊ก', 'ปลั๊กพ่วง / สายไฟ', 'โคมไฟ / หลอดไฟ'].includes(c.name)).map(c => (
                        <option key={c.id} value={c.name} />
                      ))}
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
                  <div className={`border-2 border-dashed border-gray-400 print:border-black p-4 rounded w-[56mm] mx-auto text-black print:font-bold ${printMode && printMode !== 'coupon' ? 'hidden print:hidden' : 'block mb-8'}`}>
                    <h1 className="text-xl font-bold text-center mb-2">ใบคูปองซ่อม (ลูกค้า)</h1>
                    <p className="text-center font-bold">{centerName}</p>
                    <p className="text-center text-[10px] mb-4 border-b border-gray-400 print:border-black pb-4">ศูนย์ซ่อมสร้างเพื่อชุมชน (Fix IT Center)</p>
                    <div className="flex flex-col gap-2 text-xs">
                      <div><span className="font-bold">รหัสคิวงาน:</span> {customerData?.jobId || 'กำลังออกรหัส...'}</div>
                      <div><span className="font-bold">ชื่อลูกค้า:</span> {customerData?.firstName} {customerData?.lastName}</div>
                      <div><span className="font-bold">วันที่ส่งซ่อม:</span> {new Date().toLocaleDateString('th-TH')}</div>
                      <div><span className="font-bold">สินค้าที่ซ่อม:</span> {productType} {productDetail}</div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-400 print:border-black text-center text-[10px] text-black">
                      <p>กรุณานำคูปองนี้มาด้วยเมื่อมารับเครื่อง</p>
                      <p className="mt-1 font-bold text-xs">ติดต่อสอบถาม: {contactPhone}</p>
                    </div>
                  </div>

                  {/* ใบแนบสินค้า */}
                  <div className={`border-2 border-dashed border-gray-400 print:border-black print:font-bold p-3 rounded mx-auto text-black font-sans w-[56mm] ${printMode && printMode !== 'attach' ? 'hidden print:hidden' : 'block mb-8'}`}>
                    <h1 className="text-sm font-bold text-center mb-2">ใบส่งซ่อม (แนบสินค้า)</h1>
                    <div className="flex justify-end mb-2 text-[10px]">
                      <div className="text-black font-bold">เลขที่ <span className="border-b border-dotted border-black inline-block w-16 text-center">{customerData?.jobId || ''}</span></div>
                    </div>
                    <div className="flex mb-1 text-[10px]">
                      <span className="font-bold whitespace-nowrap">ชื่อ-สกุล</span>
                      <span className="flex-1 border-b border-dotted border-black ml-1 pl-1 truncate">{customerData?.firstName} {customerData?.lastName}</span>
                    </div>
                    <div className="flex mb-1 text-[10px]">
                      <span className="font-bold whitespace-nowrap">โทรศัพท์</span>
                      <span className="flex-1 border-b border-dotted border-black ml-1 pl-1 truncate">{phone || ''}</span>
                    </div>
                    <div className="flex mb-3 text-[10px]">
                      <span className="font-bold whitespace-nowrap">อาการเสีย</span>
                      <span className="flex-1 border-b border-dotted border-black ml-1 pl-1 truncate">{symptoms}</span>
                    </div>
                    
                    <table className="w-full border-collapse border border-black mb-3 text-[10px]">
                      <thead>
                        <tr>
                          <th className="border border-black p-1 font-bold">รายการซ่อม</th>
                          <th className="border border-black p-1 font-bold w-12">ค่าอะไหล่</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr><td className="border border-black h-5"></td><td className="border border-black"></td></tr>
                        <tr><td className="border border-black h-5"></td><td className="border border-black"></td></tr>
                        <tr><td className="border border-black h-5"></td><td className="border border-black"></td></tr>
                        <tr>
                          <td className="border border-black p-1 text-center font-bold">รวมเงิน</td>
                          <td className="border border-black p-1 text-center"></td>
                        </tr>
                      </tbody>
                    </table>

                    <div className="flex justify-between mb-3 mt-2 text-[10px] px-1">
                      <label className="flex items-center gap-1">
                        <input type="checkbox" className="w-3 h-3 print:appearance-none print:w-3 print:h-3 print:border print:border-black print:bg-white" /> ซ่อมคุ้มค่า
                      </label>
                      <label className="flex items-center gap-1">
                        <input type="checkbox" className="w-3 h-3 print:appearance-none print:w-3 print:h-3 print:border print:border-black print:bg-white" /> ไม่คุ้มค่า
                      </label>
                    </div>

                    <div className="flex justify-center mt-3 text-[10px]">
                      <span className="mr-1">ลงชื่อ</span>
                      <span className="border-b border-dotted border-black inline-block w-16 mx-1"></span>
                      <span>ผู้ประเมิน</span>
                    </div>
                  </div>

                  {/* ใบงานช่าง (A4 Form Layout) */}
                  <div className={`print:p-0 print:m-0 w-full max-w-4xl mx-auto bg-white text-black font-sans ${printMode && printMode !== 'full' ? 'hidden print:hidden' : 'block'}`}>
                    
                    {/* Header */}
                    <div className="text-center mb-6">
                      <div className="flex justify-center mb-2">
                        <img src="/fixit_logo.jpg" alt="Fix IT Center Logo" className="h-20 object-contain" />
                      </div>
                      <h1 className="text-2xl font-bold">ศูนย์ซ่อมสร้างเพื่อชุมชน (Fix it Center)</h1>
                      <h2 className="text-xl font-bold mt-1">ใบรับงานซ่อม (Repair Form)</h2>
                      <p className="mt-4 text-lg">ชื่อศูนย์ <span className="underline decoration-dotted underline-offset-4 px-12">{centerName}</span></p>
                    </div>

                    {/* Table Container */}
                    <div className="border border-black">
                      
                      {/* Row 1: Date and Job ID */}
                      <div className="flex border-b border-black text-sm">
                        <div className="flex-1 p-2 border-r border-black flex items-center">
                          <span>วัน / เดือน / ปี</span>
                          <span className="flex-1 border-b border-dotted border-black mx-2 text-center text-blue-700">{new Date().toLocaleDateString('th-TH')}</span>
                          <span>เวลา</span>
                          <span className="w-24 border-b border-dotted border-black ml-2 text-center text-blue-700">{new Date().toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <div className="w-1/3 p-2 flex items-center">
                          <span>เลขที่</span>
                          <span className="flex-1 border-b border-dotted border-black ml-2 text-center text-blue-700">{customerData?.jobId || ''}</span>
                        </div>
                      </div>

                      {/* Row 2: Customer Info & Photo */}
                      <div className="flex border-b border-black min-h-[260px] text-sm">
                        {/* Left: Customer Info */}
                        <div className="flex-1 p-3 border-r border-black flex flex-col gap-3">
                          <div className="font-bold">ส่วนของผู้รับบริการ</div>
                          <div className="flex">
                            <span>ชื่อ - สกุล นาย/นาง/นางสาว</span>
                            <span className="flex-1 border-b border-dotted border-black ml-2 pl-2 text-blue-700">{customerData?.firstName} {customerData?.lastName}</span>
                          </div>
                          <div className="flex">
                            <span>บัตรประจำตัวประชาชน</span>
                            <span className="flex-1 border-b border-dotted border-black ml-2 pl-2 text-blue-700">{customerData?.citizenId}</span>
                          </div>
                          <div className="flex">
                            <span>ที่อยู่บ้านเลขที่</span>
                            <span className="w-24 border-b border-dotted border-black mx-2 pl-2 text-blue-700 truncate">{customerData?.address?.split(' ')[0] || ''}</span>
                            <span>หมู่ที่</span>
                            <span className="flex-1 border-b border-dotted border-black ml-2 pl-2 text-blue-700 truncate">{(customerData?.address?.match(/หมู่ที่\s*(\d+)/) || [])[1] || ''}</span>
                          </div>
                          <div className="flex">
                            <span>ตำบล</span>
                            <span className="flex-1 border-b border-dotted border-black mx-2 text-blue-700 truncate">{(customerData?.address?.match(/(?:ตำบล|แขวง)\s*([^\s]+)/) || [])[1] || ''}</span>
                            <span>อำเภอ</span>
                            <span className="flex-1 border-b border-dotted border-black ml-2 text-blue-700 truncate">{(customerData?.address?.match(/(?:อำเภอ|เขต)\s*([^\s]+)/) || [])[1] || ''}</span>
                          </div>
                          <div className="flex">
                            <span>จังหวัด</span>
                            <span className="flex-1 border-b border-dotted border-black mx-2 text-blue-700 truncate">{(customerData?.address?.match(/(?:จังหวัด)\s*([^\s]+)/) || [])[1] || ''}</span>
                            <span>โทรศัพท์</span>
                            <span className="flex-1 border-b border-dotted border-black ml-2 pl-2 text-blue-700">{phone || ''}</span>
                          </div>
                          <div className="flex">
                            <span>สิ่งของที่นำมาซ่อม</span>
                            <span className="flex-1 border-b border-dotted border-black ml-2 pl-2 text-blue-700">{productDetail}</span>
                          </div>
                          <div>
                            <div>ประเภทเครื่องใช้ที่ซ่อม</div>
                            <div className="grid grid-cols-2 gap-2 mt-2 ml-4">
                              <label className="flex items-center gap-2"><input type="checkbox" className="w-4 h-4 print:appearance-none print:w-4 print:h-4 print:border print:border-black print:checked:bg-black" defaultChecked={productType === 'เครื่องมือการเกษตร'} /> เครื่องมือ/เครื่องจักรกลการเกษตร</label>
                              <label className="flex items-center gap-2"><input type="checkbox" className="w-4 h-4 print:appearance-none print:w-4 print:h-4 print:border print:border-black print:checked:bg-black" defaultChecked={['พัดลม', 'เตารีด', 'เครื่องใช้ไฟฟ้า'].includes(productType)} /> เครื่องใช้ไฟฟ้า/เครื่องใช้ในครัวเรือน</label>
                              <label className="flex items-center gap-2"><input type="checkbox" className="w-4 h-4 print:appearance-none print:w-4 print:h-4 print:border print:border-black print:checked:bg-black" defaultChecked={productType === 'ยานพาหนะ'} /> ยานพาหนะ</label>
                              <div className="flex items-center gap-2">
                                <input type="checkbox" className="w-4 h-4 print:appearance-none print:w-4 print:h-4 print:border print:border-black print:checked:bg-black" defaultChecked={!['เครื่องมือการเกษตร', 'พัดลม', 'เตารีด', 'ยานพาหนะ', 'เครื่องใช้ไฟฟ้า'].includes(productType) && productType !== ''} /> 
                                <span>อื่น ๆ (โปรดระบุ)</span>
                                <span className="flex-1 border-b border-dotted border-black truncate px-2 text-blue-700">{!['เครื่องมือการเกษตร', 'พัดลม', 'เตารีด', 'ยานพาหนะ', 'เครื่องใช้ไฟฟ้า'].includes(productType) ? productType : ''}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* Right: ID Card Photo */}
                        <div className="w-1/3 p-4 flex flex-col items-center justify-center relative">
                          {customerData?.photo ? (
                            <img src={customerData.photo} alt="ID Card" className="max-w-[140px] max-h-[180px] object-cover border-2 border-gray-400 p-1" />
                          ) : (
                            <div className="w-[140px] h-[180px] border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-sm text-center px-4">
                              (แปะรูปถ่าย หรือสำเนาบัตร)
                            </div>
                          )}
                          <div className="mt-2 text-sm text-center">( สำเนาบัตรประชาชน ผู้ใช้บริการ )</div>
                          <div className="mt-4 flex flex-col items-center">
                            <div className="flex items-end">
                              <span className="mr-2">ลงชื่อ</span>
                              <span className="border-b border-dotted border-black inline-block w-32"></span>
                            </div>
                            <span className="mt-1 text-sm">ผู้รับบริการ</span>
                          </div>
                        </div>
                      </div>

                      {/* Row 3: Symptoms, Condition, Accessories */}
                      <div className="flex border-b border-black text-sm">
                        <div className="flex-1 p-2 border-r border-black flex flex-col items-center min-h-[100px]">
                          <span className="font-bold mb-2">อาการเสีย</span>
                          <div className="w-full text-left pl-2">
                            <div>1. <span className="border-b border-dotted border-black inline-block w-11/12 pl-2 text-blue-700">{symptoms}</span></div>
                            <div className="mt-3">2. <span className="border-b border-dotted border-black inline-block w-11/12"></span></div>
                          </div>
                        </div>
                        <div className="flex-1 p-2 border-r border-black flex flex-col items-center">
                          <span className="font-bold mb-2">สภาพเครื่องใช้ที่นำมาซ่อม</span>
                          <div className="w-full text-left pl-2">
                            <div>1. <span className="border-b border-dotted border-black inline-block w-11/12"></span></div>
                            <div className="mt-3">2. <span className="border-b border-dotted border-black inline-block w-11/12"></span></div>
                          </div>
                        </div>
                        <div className="flex-1 p-2 flex flex-col items-center">
                          <span className="font-bold mb-2">อุปกรณ์ที่ติดมาด้วย</span>
                          <div className="w-full text-left pl-2">
                            <div>1. <span className="border-b border-dotted border-black inline-block w-11/12"></span></div>
                            <div className="mt-3">2. <span className="border-b border-dotted border-black inline-block w-11/12"></span></div>
                          </div>
                        </div>
                      </div>

                      {/* Row 4: Details */}
                      <div className="border-b border-black p-3 text-sm min-h-[80px]">
                        <span className="font-bold">รายละเอียด</span>
                        <div className="mt-5 border-b border-dotted border-black w-full"></div>
                        <div className="mt-6 border-b border-dotted border-black w-full"></div>
                      </div>

                      {/* Row 5: Repair Details & Technician */}
                      <div className="flex text-sm">
                        <div className="flex-1 p-3 border-r border-black flex flex-col gap-5">
                          <div className="flex mt-2">
                            <span className="font-bold w-32">รายละเอียดการซ่อม</span>
                            <span className="flex-1 border-b border-dotted border-black"></span>
                          </div>
                          <div className="flex">
                            <span className="font-bold w-24">วันที่เริ่มซ่อม</span>
                            <span className="flex-1 border-b border-dotted border-black mx-2"></span>
                            <span className="font-bold">เวลา</span>
                            <span className="flex-1 border-b border-dotted border-black ml-2"></span>
                          </div>
                          <div className="flex mb-2">
                            <span className="font-bold w-24">วันที่ซ่อมเสร็จ</span>
                            <span className="flex-1 border-b border-dotted border-black mx-2"></span>
                            <span className="font-bold">เวลา</span>
                            <span className="flex-1 border-b border-dotted border-black ml-2"></span>
                          </div>
                        </div>
                        <div className="flex-1 p-3 flex flex-col gap-4 text-center">
                          <div className="font-bold">ผู้ดำเนินการซ่อม / ตรวจเช็ค</div>
                          <div className="flex text-left">
                            <span className="w-16">ชื่อ-สกุล</span>
                            <span className="flex-1 border-b border-dotted border-black ml-2"></span>
                          </div>
                          <div className="flex text-left">
                            <span className="w-16">สาขาวิชา</span>
                            <span className="flex-1 border-b border-dotted border-black ml-2"></span>
                          </div>
                          <div className="flex text-left">
                            <span className="w-20">ครูสาขาวิชา</span>
                            <span className="flex-1 border-b border-dotted border-black ml-2"></span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer Signatures */}
                    <div className="flex justify-between mt-8 px-4 text-sm">
                      <div className="flex-1 text-center">
                        <div className="flex justify-center items-end">
                          <span className="font-bold">ผู้รับเครื่อง</span>
                          <span className="w-40 border-b border-dotted border-black mx-2"></span>
                          <span className="font-bold">วันที่</span>
                          <span className="w-24 border-b border-dotted border-black ml-2"></span>
                        </div>
                      </div>
                      <div className="flex-1 text-center">
                        <div className="flex justify-center items-end">
                          <span className="font-bold">ผู้ส่งมอบเครื่อง</span>
                          <span className="w-40 border-b border-dotted border-black mx-2"></span>
                          <span className="font-bold">วันที่</span>
                          <span className="w-24 border-b border-dotted border-black ml-2"></span>
                        </div>
                      </div>
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
