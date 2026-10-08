import time
from flask import Flask, jsonify
from flask_cors import CORS
from smartcard.System import readers
from smartcard.Exceptions import NoCardException

app = Flask(__name__)
CORS(app)

@app.route('/api/read_card', methods=['GET'])
def read_card():
    r = readers()
    if len(r) == 0:
        return jsonify({"success": False, "message": "ไม่พบเครื่องอ่านบัตร (No Reader)"})
    
    reader = r[0]
    
    try:
        connection = reader.createConnection()
        connection.connect()
        
        # ส่งคำสั่ง SELECT Applet ของบัตรประชาชนไทย
        SELECT = [0x00, 0xA4, 0x04, 0x00, 0x08, 0xA0, 0x00, 0x00, 0x00, 0x54, 0x48, 0x00, 0x01]
        data, sw1, sw2 = connection.transmit(SELECT)
        
        def read_data(cmd):
            d, s1, s2 = connection.transmit(cmd)
            if s1 == 0x61:
                d, s1, s2 = connection.transmit([0x00, 0xC0, 0x00, 0x00, s2])
            # TIS-620 decode and replace '#' with space
            return bytes(d).decode('tis-620', errors='ignore').strip().replace('#', ' ').strip()
            
        # ชุดคำสั่งดึงข้อมูล
        CMD_CID = [0x80, 0xb0, 0x00, 0x04, 0x02, 0x00, 0x0d]
        CMD_THFULLNAME = [0x80, 0xb0, 0x00, 0x11, 0x02, 0x00, 0x64]
        CMD_ENFULLNAME = [0x80, 0xb0, 0x00, 0x75, 0x02, 0x00, 0x64]
        CMD_DOB = [0x80, 0xb0, 0x00, 0xD9, 0x02, 0x00, 0x08]
        CMD_ADDRESS = [0x80, 0xb0, 0x15, 0x79, 0x02, 0x00, 0x64]
        
        citizen_id = read_data(CMD_CID)
        th_name = read_data(CMD_THFULLNAME)
        en_name = read_data(CMD_ENFULLNAME)
        dob = read_data(CMD_DOB)
        address = read_data(CMD_ADDRESS)
        
        # จัดรูปแบบวันที่
        if len(dob) == 8:
            dob = f"{dob[0:4]}-{dob[4:6]}-{dob[6:8]}"
            
        # แยกชื่อ-นามสกุลเบื้องต้น
        th_parts = [p for p in th_name.split(' ') if p]
        title = th_parts[0] if len(th_parts) > 0 else ""
        first_name = th_parts[1] if len(th_parts) > 1 else ""
        last_name = th_parts[2] if len(th_parts) > 2 else ""
        
        # --- ดึงรูปถ่าย (Photo) ---
        photo_base64 = ""
        try:
            import base64
            photo_data = bytearray()
            offset = 0x017B
            for i in range(21):
                length = 254 if i < 20 else 38
                p1 = (offset >> 8) & 0xFF
                p2 = offset & 0xFF
                cmd = [0x80, 0xB0, p1, p2, 0x02, 0x00, length]
                d, s1, s2 = connection.transmit(cmd)
                
                if s1 == 0x61:
                    d, s1, s2 = connection.transmit([0x00, 0xC0, 0x00, 0x00, s2])
                    
                photo_data.extend(d)
                offset += length
            
            photo_base64 = base64.b64encode(photo_data).decode('utf-8')
        except Exception as e:
            print("Error reading photo:", str(e))
        
        real_data = {
            "citizenId": citizen_id,
            "title": title,
            "firstName": first_name,
            "lastName": last_name,
            "fullNameEN": en_name,
            "address": address.replace('  ', ' '),
            "dob": dob,
            "photo": f"data:image/jpeg;base64,{photo_base64}" if photo_base64 else None
        }
        
        return jsonify({
            "success": True, 
            "message": "อ่านบัตรสำเร็จ", 
            "data": real_data
        })
        
    except NoCardException:
        return jsonify({"success": False, "message": "กรุณาเสียบบัตรประชาชน (No Card Inserted)"})
    except Exception as e:
        return jsonify({"success": False, "message": f"Error: {str(e)}"})

if __name__ == '__main__':
    print("Thai ID Card Local Agent is running on http://localhost:8081")
    print("Detected readers:", readers())
    app.run(port=8081)
