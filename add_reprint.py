import sys
content = open('src/app/dashboard/page.tsx', 'r', encoding='utf-8').read()

func = """
  const reprintJob = (job: any) => {
    const nameParts = (job.customer?.name || '').split(' ');
    setCustomerData({
      jobId: job.jobId,
      citizenId: job.customer?.citizenId || '-',
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      address: job.customer?.address || '-',
      photo: null,
      title: ''
    });
    setPhone(job.customer?.phone || '-');
    setProductType(job.category?.name || '');
    setProductDetail(job.itemDetail || '');
    setSymptoms(job.symptoms || '');
    setStep(4);
  };
"""
content = content.replace('  const updateJobStatus = async', func + '\n  const updateJobStatus = async')

btn_code = """
                                    )}
                                    <button onClick={() => reprintJob(job)} className="text-white bg-gray-500 hover:bg-gray-600 px-2 py-1 rounded text-xs font-medium ml-1 mt-1 sm:mt-0" title="พิมพ์เอกสารย้อนหลัง">
                                      พิมพ์
                                    </button>
                                  </>
                                )}
"""
content = content.replace("""                                    )}
                                  </>
                                )}""", btn_code)

open('src/app/dashboard/page.tsx', 'w', encoding='utf-8').write(content)
