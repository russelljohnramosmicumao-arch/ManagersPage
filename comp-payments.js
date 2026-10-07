'use strict';
window.KBRPayments=Object.freeze({
 isNonSale:r=>!!r&&(r.nonSale===true||['barista-drink','kuya-john'].includes(r.payment||r.paymentMethod)),
 value:r=>Number(r?.retailValue??r?.total)||0,
 sales:r=>r?.cancelled?0:r&&(r.nonSale===true||['barista-drink','kuya-john'].includes(r.payment||r.paymentMethod))?0:Number(r?.salesTotal??r?.total)||0,
 label:r=>{const method=r?.payment||r?.paymentMethod;if(method==='pay-later')return 'Pay Later · '+(r.customerName||'Customer')+' · due ₱'+(Number(r.balanceDue)||0).toFixed(2);if(method==='split')return 'Cash ₱'+(Number(r.cashPaid)||0).toFixed(2)+' + GCash ₱'+(Number(r.gcashPaid)||0).toFixed(2);if(method==='barista-drink')return 'Barista Drinks · '+(r.baristaName||r.compRecord?.person||'Barista');if(method==='kuya-john')return 'Kuya John · charged to owner';return method==='gcash'?'GCash':method==='cash'?'Cash':String(method||'Not recorded');}
});
