(()=>{frappe.provide("erpnext");$.extend(erpnext,{});frappe.ui.form.on("Quotation","get_history",function(r){var t=cur_frm.get_selected();t.items&&frappe.call({method:"dhupar_group.dhupar_group.get_history.get_item_history",args:{customer:cur_frm.doc.customer_name,items:cur_frm.doc.items,items_array:t.items,invoice:cur_frm.doc.name},callback:function(e){if(console.log(e),e.message[0].length>0){frappe.msgprint(`
                    <div style="height: 400px; overflow-y: auto; margin-bottom: 10px;" class="table-wrapper-scroll-y">
                        <table class="table table-bordered table-striped table-sm">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Item Code</th>
                                    <th>Description</th>
                                    <th>Pricelist Rate</th>
                                    <th>QTY.</th>
                                    <th>discount</th>
                                </tr>
                            </thead>
                            <tbody id="history-table">
                                
                            </tbody
                        </table>
                    </div>`),frappe.msgprint(`
                    <div style="height: 400px; overflow-y: auto; margin-bottom: 10px;" class="table-wrapper-scroll-y">
                        <table class="table table-bordered table-striped table-sm">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Item Code</th>
                                    <th>Description</th>
                                    <th>Pricelist Rate</th>
                                    <th>QTY.</th>
                                    <th>discount</th>
                                </tr>
                            </thead>
                            <tbody id="history-table">
                                
                            </tbody
                        </table>
                    </div>`);for(var s=document.getElementById("history-table"),a=0;a<e.message.length;a++)for(var o=0;o<e.message[a].length;o++){var l=s.insertRow(s.rows.length);l.innerHTML="<td>"+moment(e.message[a][o][0]).format("MM/DD/YYYY")+"</td><td>"+e.message[a][o][1]+"</td><td>"+e.message[a][o][2]+"</td><td>"+e.message[a][o][4]+"</td><td>"+e.message[a][o][3]+"</td><td>"+e.message[a][o][5]+"</td>"}}else frappe.msgprint("Never Sold to "+cur_frm.doc.customer_name)}})});frappe.ui.form.on("Blanket Order",{setup:function(r){cur_frm.set_query("contact_person",function(){return{filters:[["Dynamic Link","link_doctype","=","Customer"],["Dynamic Link","link_name","=",cur_frm.doc.customer]]}}),cur_frm.set_query("customer_address",function(){return{filters:[["Dynamic Link","link_doctype","=","Customer"],["Dynamic Link","link_name","=",cur_frm.doc.customer]]}})},onload:function(r){setTimeout(()=>{for(var t=document.getElementsByClassName("grid-row-check pull-left"),e=0;e<t.length;e++)t[e].removeAttribute("disabled")},300)},before_save:function(r){cur_frm.doc.net_total=0,cur_frm.doc.items.forEach(function(t,e){cur_frm.doc.items[e].discount_percentage==null&&(cur_frm.doc.items[e].discount_percentage=0,cur_frm.refresh_fields()),cur_frm.doc.items[e].rate=cur_frm.doc.items[e].price_list_rate*(1-cur_frm.doc.items[e].discount_percentage/100),cur_frm.doc.items[e].amount=cur_frm.doc.items[e].rate*cur_frm.doc.items[e].qty,cur_frm.doc.net_total=cur_frm.doc.net_total+cur_frm.doc.items[e].amount}),cur_frm.refresh_fields()}});frappe.ui.form.on("Blanket Order Item",{onload:function(r,t,e){locals[t][e].discount_percentage=0,cur_frm.refresh_fields()},price_list_rate:function(r,t,e){locals[t][e].discount_percentage==null&&(locals[t][e].discount_percentage=0,cur_frm.refresh_fields()),locals[t][e].rate=locals[t][e].price_list_rate*(1-locals[t][e].discount_percentage/100),locals[t][e].amount=locals[t][e].rate*locals[t][e].qty,cur_frm.refresh_fields()},discount_percentage:function(r,t,e){locals[t][e].rate=locals[t][e].price_list_rate*(1-locals[t][e].discount_percentage/100),locals[t][e].amount=locals[t][e].rate*locals[t][e].qty,cur_frm.refresh_fields()},qty:function(r,t,e){locals[t][e].discount_percentage==null&&(locals[t][e].discount_percentage=0,cur_frm.refresh_fields()),locals[t][e].rate=locals[t][e].price_list_rate*(1-locals[t][e].discount_percentage/100),locals[t][e].amount=locals[t][e].rate*locals[t][e].qty,cur_frm.refresh_fields()}});frappe.ui.form.on("Customer",{onload:function(r){}});frappe.ui.form.on("Sales Order",{after_save(r){frappe.call({method:"dhupar_group.remainder_automation.outstanding.update_email_id",args:{customer_name1:r.doc.customer,billing_email_id1:r.doc.billing_email_id},callback:function(t){t.message&&console.log(t.message)}})}});frappe.provide("erpnext");$.extend(erpnext,{consoleerp_hi:function(r){frappe.confirm("Are you sure you want to close the sales order?",()=>{frappe.call({method:"erpnext.selling.doctype.sales_order.sales_order.update_status",args:{status:"Closed",name:r},callback:function(t){frappe.msgprint({title:__("Notification"),indicator:"green",message:__("Sales Order Closed Successfully")})}})},()=>{})},close_sales_order2:function(r){frappe.confirm("Are you sure you want to close the sales order?",()=>{frappe.call({method:"reservation_system.custome_actions.update_sales_order_status_to_cancel",args:{name:r},callback:function(t){frappe.msgprint({title:__("Notification"),indicator:"green",message:__("Sales Order Closed Successfully")})}})},()=>{})}});window.onload=function(){console.log("hello from bundle")};})();
//# sourceMappingURL=dhupar_group.bundle.FQ56OUIB.js.map
