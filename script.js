/* =========================================================
   Lungจั้มมั้ม — script.js (ใช้ร่วมกันทุกหน้า)
   ========================================================= */

// ---------------------------------------------------------
// ⚙️ ตั้งค่าตรงนี้ให้ครบก่อนใช้งานจริง
// ---------------------------------------------------------
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyCB025yabQxfeo2hcMI9I4enaUNFl3YelzgT59_kj1rHBg7A2LdKAO-D34tM5glkSz/exec"; // URL ของ Web App (/exec) จาก Google Apps Script
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTvn1wMZXw4W-ZlqR77HCKEZfi6nMEIE3XF9tmF4Y9ncX1Jyp3p3L14uyQvXYUm4_0U6fUawrJLg_wI/pub?gid=0&single=true&output=csv";                 // URL CSV ของ Google Sheet ที่ publish ไว้

// ---------------------------------------------------------
// 🧰 Utility functions
// ---------------------------------------------------------

/** อ่านค่า query parameter จาก URL ปัจจุบัน */
function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

/** แปลงตัวเลขราคาให้เป็น string แบบมี comma คั่นหลักพัน */
function formatPrice(num) {
  const n = Number(num);
  if (Number.isNaN(n)) return num;
  return n.toLocaleString("th-TH");
}

/** CSV parser แบบง่าย รองรับฟิลด์ที่ครอบด้วย " และมี comma อยู่ข้างใน */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(field);
        field = "";
      } else if (char === "\n" || char === "\r") {
        if (char === "\r" && next === "\n") i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += char;
      }
    }
  }

  // เก็บ field/row สุดท้ายที่เหลือ (กรณีไฟล์ไม่ได้ลงท้ายด้วย newline)
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // ตัดแถวว่างทิ้ง (เช่นบรรทัดสุดท้ายที่เป็น "")
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

// ===========================================================
// 1) product.html — แสดงรายการสินค้า + ปุ่มกรองตาม mood
// ===========================================================
function initProductPage() {
  const productList = document.getElementById("product-list");
  const filterBar = document.getElementById("filter-bar");
  if (!productList || !filterBar) return; // ไม่ใช่หน้านี้ ข้ามไป

  let allProducts = [];

  fetch("products.json")
    .then((res) => res.json())
    .then((products) => {
      allProducts = products;

      const moods = [...new Set(products.map((p) => p.mood))];
      renderFilterBar(moods);

      const initialMood = getQueryParam("mood");
      renderProductList(initialMood ? filterByMood(allProducts, initialMood) : allProducts);
      setActiveFilterButton(initialMood);
    })
    .catch((err) => {
      productList.innerHTML = `<p>ไม่สามารถโหลดข้อมูลสินค้าได้ในขณะนี้</p>`;
      console.error("โหลด products.json ไม่สำเร็จ:", err);
    });

  function filterByMood(products, mood) {
    return products.filter((p) => p.mood === mood);
  }

  function renderFilterBar(moods) {
    filterBar.innerHTML = "";

    const allBtn = document.createElement("button");
    allBtn.className = "btn btn-secondary filter-btn";
    allBtn.textContent = "ทั้งหมด";
    allBtn.dataset.mood = "";
    filterBar.appendChild(allBtn);

    moods.forEach((mood) => {
      const btn = document.createElement("button");
      btn.className = "btn btn-secondary filter-btn";
      btn.textContent = mood;
      btn.dataset.mood = mood;
      filterBar.appendChild(btn);
    });

    filterBar.addEventListener("click", (e) => {
      const btn = e.target.closest(".filter-btn");
      if (!btn) return;

      const mood = btn.dataset.mood;
      const url = new URL(window.location.href);
      if (mood) {
        url.searchParams.set("mood", mood);
      } else {
        url.searchParams.delete("mood");
      }
      window.history.pushState({}, "", url);

      renderProductList(mood ? filterByMood(allProducts, mood) : allProducts);
      setActiveFilterButton(mood);
    });
  }

  function setActiveFilterButton(mood) {
    const buttons = filterBar.querySelectorAll(".filter-btn");
    buttons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.mood === (mood || ""));
    });
  }

  function renderProductList(products) {
    productList.innerHTML = "";

    if (products.length === 0) {
      productList.innerHTML = `<p>ไม่พบสินค้าตามที่เลือก</p>`;
      return;
    }

    products.forEach((p) => {
      const card = document.createElement("div");
      card.className = "product-card";
      card.innerHTML = `
        <div class="product-image">
          <img src="${p.image}" alt="${p.name}" loading="lazy">
        </div>
        <div class="product-info">
          <span class="product-mood">${p.mood}</span>
          <h3>${p.name}</h3>
          <p class="product-desc">${p.description}</p>
          <div class="product-footer">
            <span class="product-price">฿${formatPrice(p.price)}</span>
            <span class="product-size">${p.size}</span>
          </div>
          <button class="btn btn-primary order-btn">สั่งซื้อ</button>
        </div>
      `;

      card.querySelector(".order-btn").addEventListener("click", () => {
        const url = `order.html?item=${encodeURIComponent(p.name)}&price=${encodeURIComponent(p.price)}`;
        window.location.href = url;
      });

      productList.appendChild(card);
    });
  }
}

// ===========================================================
// 2) order.html — ฟอร์มสั่งซื้อ, auto-fill จาก URL param, ส่ง POST
// ===========================================================
function initOrderPage() {
  const form = document.getElementById("orderForm");
  if (!form) return; // ไม่ใช่หน้านี้ ข้ามไป

  const itemsField = document.getElementById("items");
  const totalField = document.getElementById("total");
  const customerNameField = document.getElementById("customerName");
  const contactField = document.getElementById("contact");
  const noteField = document.getElementById("note");

  // --- Auto-fill จาก URL param ---
  const itemParam = getQueryParam("item");
  const priceParam = getQueryParam("price");

  if (itemParam && itemsField) {
    itemsField.value = decodeURIComponent(itemParam);
  }

  if (priceParam && totalField) {
    // ห้ามลืมช่อง total เด็ดขาด
    totalField.value = priceParam;
  }

  // --- Submit ฟอร์ม ---
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const payload = {
      customerName: customerNameField ? customerNameField.value : "",
      contact: contactField ? contactField.value : "",
      items: itemsField ? itemsField.value : "",
      total: totalField ? totalField.value : "",
      note: noteField ? noteField.value : "",
    };

    const submitBtn = form.querySelector('button[type="submit"], .btn-primary');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "กำลังส่งคำสั่งซื้อ...";
    }

    // หมายเหตุ: Google Apps Script Web App มักจะ redirect ไปที่
    // script.googleusercontent.com ก่อนส่ง response กลับจริง ทำให้บาง
    // browser อ่าน response ต่อไม่ได้ (ติด CORS ตอน redirect) แม้ว่า
    // ฝั่ง Apps Script จะรันจบและเขียนข้อมูลลง Sheet สำเร็จไปแล้วก็ตาม
    // จึงไม่ยึด res.text() เป็นตัวตัดสินความสำเร็จ แต่ redirect ไป
    // thankyou.html ทันทีที่ request ถูกส่งออกไปโดยไม่มี network error จริงๆ
    fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload),
    })
      .then(() => {
        window.location.href = "thankyou.html";
      })
      .catch((err) => {
        console.error("ส่งคำสั่งซื้อไม่สำเร็จ:", err);
        alert("เกิดข้อผิดพลาดในการส่งคำสั่งซื้อ กรุณาลองใหม่อีกครั้ง");
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "ยืนยันคำสั่งซื้อ";
        }
      });
  });
}

// ===========================================================
// 3) admin.html — ดึง CSV มาแสดงในตาราง
// ===========================================================
function initAdminPage() {
  const table = document.getElementById("ordersTable");
  if (!table) return; // ไม่ใช่หน้านี้ ข้ามไป

  const tbody = table.querySelector("tbody");
  if (!tbody) return;

  fetch(CSV_URL)
    .then((res) => res.text())
    .then((csvText) => {
      const rows = parseCSV(csvText);
      renderOrdersTable(rows);
    })
    .catch((err) => {
      tbody.innerHTML = `<tr><td colspan="6">ไม่สามารถโหลดข้อมูลคำสั่งซื้อได้ในขณะนี้</td></tr>`;
      console.error("โหลด CSV ไม่สำเร็จ:", err);
    });

  function renderOrdersTable(rows) {
    tbody.innerHTML = "";

    if (rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6">ยังไม่มีคำสั่งซื้อ</td></tr>`;
      return;
    }

    // สมมติคอลัมน์ตามลำดับที่ Apps Script เขียนไว้:
    // [เวลา, ชื่อลูกค้า, ช่องทางติดต่อ, รายการสินค้า, ยอดรวม, หมายเหตุ]
    // ถ้า Sheet มีแถวหัวตาราง (header) ให้ลบบรรทัดถัดไปออก 1 บรรทัดก่อน loop
    rows.forEach((cols) => {
      const tr = document.createElement("tr");
      cols.forEach((cell) => {
        const td = document.createElement("td");
        td.textContent = cell;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }
}

// ===========================================================
// 🚀 Init ทุกหน้า (ฟังก์ชันจะ return เอง ถ้า element ของหน้านั้นไม่มีอยู่)
// ===========================================================
document.addEventListener("DOMContentLoaded", () => {
  initProductPage();
  initOrderPage();
  initAdminPage();
});
