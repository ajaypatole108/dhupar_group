cur_frm.set_df_property('items', 'allow_on_submit', 1);

// This script validate the 10 digit mobile number
frappe.ui.form.on('Sales Order', {
    validate: function(frm) {
        // Get the mobile number field value
        let mobileNumber = cur_frm.doc.customer_contact_person;

        // Define the regex pattern
        let regexPattern = /[6-9][0-9]{9}/;

        // Check if the mobile number matches the pattern
        if (!regexPattern.test(mobileNumber)) {
            // If the number does not match, throw an error
            frappe.msgprint(__("<b>Please enter a valid 10-digit mobile number (Customer Contact Person Number)</b>\n\n<ul><li>Do not add Space in Mobile Number</li> <li>Only Enter Mobile Number (Do not add Landline No.)</li></u>"));
            // frappe.validated = false;
        }
    }
});

// Here we making terms blank
frappe.ui.form.on('Sales Order', {
	onload: function(frm) {
	    cur_frm.doc.tc_name = "";
	    cur_frm.doc.terms = "";
    }
});

frappe.ui.form.on('Sales Order', {
	onload: function(frm) {
	    // If User Role Is Counter User Then apply this series
	    if (frappe.user.has_role('Counter User')){
	        cur_frm.doc.naming_series = "SO-C-";
	        cur_frm.set_df_property("naming_series","read_only",1);
	    }

	    // If User Branch is Mahape Then apply this series
	    var branch;
	    frappe.db.get_doc("User", frappe.session.user, "branch")
	    .then(r => {
	        if(r.branch == "Mahape"){
	            cur_frm.doc.naming_series = "SO-M-";
	            cur_frm.set_df_property("naming_series","read_only",1);
	        }
	    });
    }
});


frappe.ui.form.on("Sales Order", "get_stock", function (frm) {
    
    var item_list = cur_frm.get_selected();
    // console.log(item_list)
    if (item_list.items){
        frappe.call({
            method: "dhupar_group.dhupar_group.get_stock.get_item_stock",
            args:{
                'customer': cur_frm.doc.customer_name,
                'items': cur_frm.doc.items,
                'items_array': item_list.items,
                'invoice': cur_frm.doc.name
            },
            callback: function (r) {
                // console.log(r);
                if (r.message[0].length > 0) {
                    frappe.msgprint(`
                    <div style="height: 400px; overflow-y: auto;overflow-x:auto margin-bottom: 10px;" class="table-wrapper-scroll-y">
                        <table style="width:100%;" class="table table-bordered table-hover table-sm">
                            <thead>
                                <tr>
                                    <th>No</th>
                                    <th>Item</th>
                                    <th>Description</th>
                                    <th>Item Group</th>
                                    <th>Brand</th>
                                    <th>Required Qty</th>
                                    <th>Wagholi</th>
                                    <th>Pune</th>
                                    <th>Pimpri</th>
                                    <th>Mahape</th>
                                </tr>
                            </thead>
                            <tbody id="history-table">
                                
                            </tbody
                        </table>
                    </div>`);
                    
                    var table = document.getElementById("history-table");
                    for (var j = 0; j < r.message.length; j++) {
                        //console.log(r.message[0].length);
                        for (var i = 0; i < r.message[j].length; i++) {
                            //console.log(document.getElementById("history-table"));
                            var newRow = table.insertRow(table.rows.length);
                            //console.log(r.message[0].length);
                            
                            newRow.innerHTML = "<td>" + r.message[j][i][0] + "</td>" +
                                "<td>" + r.message[j][i][1] + "</td>" +
                                "<td>" + r.message[j][i][2] + "</td>" +
                                "<td>" + r.message[j][i][3] + "</td>" +
                                "<td>" + r.message[j][i][4] + "</td>" +
                                "<td>" + r.message[j][i][5] + "</td>" +
                                "<td>" + r.message[j][i][6] + "</td>" +
                                "<td>" + r.message[j][i][7] + "</td>" +
                                "<td>" + r.message[j][i][8] + "</td>" +
                                "<td>" + r.message[j][i][9] + "</td>" 
                        }
                    }
                }
            }
        });
    }
});

frappe.ui.form.on("Sales Order", "get_history", function (frm) {

    var item_list = cur_frm.get_selected();
    if (item_list.items) {

        frappe.call({
            method: "dhupar_group.dhupar_group.get_history.get_item_history",
            args: {
                'customer': cur_frm.doc.customer_name,
                'items': cur_frm.doc.items,
                'items_array': item_list.items,
                'invoice': cur_frm.doc.name
            },
            callback: function (r) {

                // console.log(r);
                if (r.message[0][0].length > 3) {
                    frappe.msgprint(`
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
                                    <th>Last Purchase Rate</th>
                                </tr>
                            </thead>
                            <tbody id="history-table">

                            </tbody
                        </table>
                    </div>`);

                    // frappe.msgprint(`
                    // <div style="height: 400px; overflow-y: auto; margin-bottom: 10px;" class="table-wrapper-scroll-y">
                    //     <table class="table table-bordered table-striped table-sm">
                    //         <thead>
                    //             <tr>
                    //                 <th>Date</th>
                    //                 <th>Item Code</th>
                    //                 <th>Description</th>
                    //                 <th>Pricelist Rate</th>
                    //                 <th>QTY.</th>
                    //                 <th>discount</th>
                    //                 <th>Last Purchase Rate</th>
                    //             </tr>
                    //         </thead>
                    //         <tbody id="history-table">

                    //         </tbody
                    //     </table>
                    // </div>`);

                    var table = document.getElementById("history-table");

                    //console.log(table);

                    for (var j = 0; j < r.message.length; j++) {
                        //console.log(r.message[0].length);
                        for (var i = 0; i < r.message[j].length; i++) {
                            //console.log(document.getElementById("history-table"));
                            var newRow = table.insertRow(table.rows.length);
                            //console.log(r.message[0].length);
                            newRow.innerHTML = "<td>" + moment(r.message[j][i][0]).format('MM/DD/YYYY') + "</td>" +
                                "<td>" + r.message[j][i][1] + "</td>" +
                                "<td>" + r.message[j][i][2] + "</td>" +
                                "<td>" + r.message[j][i][4] + "</td>" +
                                "<td>" + r.message[j][i][3] + "</td>" +
                                "<td>" + r.message[j][i][5] + "</td>" +
                                "<td>" + r.message[j][i][6] + "</td>"
                        }
                    }
                } else {
                    // frappe.msgprint("Never Sold to " + cur_frm.doc.customer_name)
                    frappe.msgprint("<center>Never Sold to "+"<b>"+ cur_frm.doc.customer_name +"</b></center>"+ "<br> <b>Last Purchase Data</b> "+`
                    <div style="height: 400px; overflow-y: auto; margin-bottom: 10px;" class="table-wrapper-scroll-y">
                        <table class="table table-bordered table-striped table-sm">
                            <thead>
                                <tr>
                                    <th>Item Code</th>
                                    <th>Item Name</th>
                                    <th>Last Purchase Rate</th>
                                </tr>
                            </thead>
                            <tbody id="history-table">
                                
                            </tbody
                        </table>
                    </div>`);

                    var table = document.getElementById("history-table");

                    //console.log(table);

                    for (var j = 0; j < r.message.length; j++) {
                        //console.log(r.message[0].length);
                        for (var i = 0; i < r.message[j].length; i++) {
                            //console.log(document.getElementById("history-table"));
                            var newRow = table.insertRow(table.rows.length);
                            //console.log(r.message[0].length);
                            newRow.innerHTML = "<td>" + r.message[j][i][0] + "</td>" +
                                "<td>" + r.message[j][i][1] + "</td>" +
                                "<td>" + r.message[j][i][2] + "</td>"
                        }
                    }
                }
            }
        });
    }
});


// aj
frappe.ui.form.on("Sales Order", "onload", function (frm){
    if (cur_frm.doc.status == 'To Deliver' || cur_frm.doc.status == 'To Deliver and Bill' || cur_frm.doc.status == 'Overdue') {
		cur_frm.add_custom_button(__('Reservation Schedule'), () => make_reservation_schedule(), __('Create'));
	}
});

frappe.ui.form.on("Sales Order", "onload",function (frm){
    frm.add_custom_button("Pick List", function() {
        frappe.model.open_mapped_doc({
			method: "dhupar_group.custom_actions.make_pick_list",
			frm: cur_frm
});
    }, "Make");
    frm.remove_custom_button("Work Order", 'Make');
frm.remove_custom_button("Request for Raw Materials", 'Make');
frm.remove_custom_button("Subscription", 'Make');
});

frappe.ui.form.on("Sales Order", "customer", function(frm){
        return frappe.call({
            method: "erpnext.accounts.utils.get_balance_on",
            args: {date: cur_frm.doc.posting_date, party_type: 'Customer', party: cur_frm.doc.customer},
            callback: function(r) {
                cur_frm.doc.total_outstanding = format_currency(r.message, erpnext.get_currency(cur_frm.doc.company));
                refresh_field('total_outstanding', 'accounts');
            }
        }),frappe.call({
            method:"frappe.client.get_list",
            args:{
                doctype:"Sales Invoice",		
                filters: {
                    'docstatus': 1,
                    "customer": cur_frm.doc.customer,
                    "status":"Overdue"
                },		
                fields: ["name", "posting_date", "rounded_total", "outstanding_amount"],
                limit_page_length:200
            },
            callback: function(r) {		
                var overdue = 0;
                for(var i = 0; i < r.message.length; i++){
                    overdue = overdue + r.message[i].outstanding_amount;
                }
                cur_frm.doc.total_overdue = overdue
                refresh_field('total_overdue', 'accounts');
            }
        });
        
});

// erpnext.selling.SalesOrderController = erpnext.selling.SellingController.extend({
//     make_purchase_order: function(frm){
//     var me = this;
//     console.log("this is running");
	
//     var dialog = new frappe.ui.Dialog({
//         title: __("For Supplier"),
//         fields: [
//             {"fieldtype": "Link", "label": __("Supplier"), "fieldname": "supplier", "options":"Supplier",
//              "description": __("Leave the field empty to make purchase orders for all suppliers"),
//                 "get_query": function () {
//                     return {
//                         query:"erpnext.selling.doctype.sales_order.sales_order.get_supplier",
//                         filters: {'parent': me.frm.doc.name}
//                     }
//                 }},
//                 {fieldname: 'items_for_po', fieldtype: 'Table', label: 'Select Items',
//                 fields: [
//                     {
//                         fieldtype:'Data',
//                         fieldname:'item_code',
//                         label: __('Item'),
//                         read_only:1,
//                         in_list_view:1
//                     },
//                     {
//                         fieldtype:'Data',
//                         fieldname:'item_name',
//                         label: __('Item name'),
//                         read_only:1,
//                         in_list_view:1
//                     },
//                     {
//                         fieldtype:'Float',
//                         fieldname:'qty',
//                         label: __('Quantity'),
//                         read_only: 1,
//                         in_list_view:1
//                     },
//                     {
//                         fieldtype:'Link',
//                         read_only:1,
//                         fieldname:'uom',
//                         label: __('UOM'),
//                         in_list_view:1
//                     }
//                 ],
//                 data: cur_frm.doc.items,
//                 get_data: function() {
//                     return cur_frm.doc.items
//                 }
//             },

//             {"fieldtype": "Button", "label": __('Create Purchase Order'), "fieldname": "make_purchase_order", "cssClass": "btn-primary"},
//         ]
//     });

//     dialog.fields_dict.make_purchase_order.$input.click(function() {
//         var args = dialog.get_values();
//         let selected_items = dialog.fields_dict.items_for_po.grid.get_selected_children()
//         if(selected_items.length == 0) {
//             frappe.throw({message: 'Please select Item form Table', title: __('Message'), indicator:'blue'})
//         }
//         let selected_items_list = []
//         for(let i in selected_items){
//             selected_items_list.push(selected_items[i].item_code)
//         }
//         dialog.hide();
//         return frappe.call({
//             type: "GET",
//             method: "erpnext.selling.doctype.sales_order.sales_order.make_purchase_order",
//             args: {
//                 "source_name": me.frm.doc.name,
//                 "for_supplier": args.supplier,
//                 "selected_items": selected_items_list
//             },
//             freeze: true,
//             callback: function(r) {
//                 if(!r.exc) {
//                     // var args = dialog.get_values();
//                     if (args.supplier){
//                         var doc = frappe.model.sync(r.message);
//                         frappe.set_route("Form", r.message.doctype, r.message.name);
//                     }
//                     else{
//                         frappe.route_options = {
//                             "sales_order": me.frm.doc.name
//                         }
//                         frappe.set_route("List", "Purchase Order");
//                     }
//                 }
//             }
//         })
//     });
//     dialog.get_field("items_for_po").grid.only_sortable()
//     dialog.get_field("items_for_po").refresh()
//     dialog.show();
// }})

// aj
function make_reservation_schedule() {
	frappe.model.open_mapped_doc({
		method: "reservation_system.reservation_system.doctype.reservation_schedule.reservation_schedule.make_reservation_schedule",
		frm: cur_frm
	})
}

//aj
frappe.ui.form.on('Sales Order', {
	before_save: function(frm) {
	    if (cur_frm.doc.taxes_and_charges != "SEZ - DBTPL" && cur_frm.doc.taxes_and_charges != "No Tax - DBTPL" && cur_frm.doc.taxes_and_charges != "Export" && cur_frm.doc.total_taxes_and_charges == 0){
	       frappe.throw("Not Allowed (check taxes_and_charges )");
	    }
    }
})

frappe.ui.form.on("Sales Order", "onload", function (frm){
    var x = document.getElementsByClassName("grid-row-check pull-left");
    for(var i=0; i<x.length;i++)
    {
        x[i].removeAttribute('disabled');
    }
});

frappe.ui.form.on("Sales Order", "customer", function (frm){
  var ageing_field = cur_frm.get_field("ageing");
  ageing_field.set_value("<style>table {  font-family: arial, sans-serif;  border-collapse: collapse;  width: 100%;}td, th {  border: 1px solid #dddddd;  text-align: left;  padding: 8px;}</style><table style=\"font-family: arial, sans-serif;border-collapse: collapse;  width: 100%;\">  <tr>    <th>0-30</th>    <th>30-60</th>    <th>60-90</th>    <th>90-120</th>    <th>120 Above</th>  </tr>  <tr>    <td>"+ '' +"</td>    <td>"+''+"</td>    <td>"+ '' +"</td>    <td>"+''+"</td>    <td>"+ '' +"</td>  </tr> </table>");
  if (!cur_frm.doc.ageing){
      if(cur_frm.doc.customer){
          get_ageing_data();
          get_pdc_data();
      }
  }
});

frappe.ui.form.on("Sales Order", "onload", function (frm){
  var ageing_field = cur_frm.get_field("ageing");
  ageing_field.set_value("<style>table {  font-family: arial, sans-serif;  border-collapse: collapse;  width: 100%;}td, th {  border: 1px solid #dddddd;  text-align: left;  padding: 8px;}</style><table style=\"font-family: arial, sans-serif;border-collapse: collapse;  width: 100%;\">  <tr>  <th>Advance</th>  <th>0-30</th>  <th>30-60</th>    <th>60-90</th>    <th>90-120</th>    <th>120 Above</th>  </tr>  <tr>  <td>"+ '' +"</td>   <td>"+ '' +"</td>    <td>"+''+"</td>    <td>"+ '' +"</td>    <td>"+''+"</td>    <td>"+ '' +"</td>  </tr> </table><br>");
  
  var outstanding_amount = cur_frm.get_field("custom_total_outstanding")
  outstanding_amount.set_value("<style>table {  font-family: arial, sans-serif;  border-collapse: collapse;  width: 100%;}td, th {  border: 1px solid #dddddd;  text-align: left;  padding: 8px;}</style><table style=\"font-family: arial, sans-serif;border-collapse: collapse;  width: 100%;\">  <br> <tr> <td width='50%'>Total Outstanding</td>  <td width='50%'>"+ '' +"</td> </tr> </table> <br>")
 
  if (!cur_frm.doc.ageing){
      if(cur_frm.doc.customer){
          get_ageing_data();
          get_outstanding_amt();
          get_pdc_data();
      }
  }
});

function get_ageing_data(){
    frappe.call({
        method: "dhupar_group.custom_actions.get_ageing_data",
        args: {"customer" : cur_frm.doc.customer, "company": cur_frm.doc.company},
        callback: function(r) {
            var data = r.message[0];
            var ageing_field = cur_frm.get_field("ageing")
            ageing_field.set_value("<style>table {  font-family: arial, sans-serif;  border-collapse: collapse;  width: 100%;}td, th {  border: 1px solid #dddddd;  text-align: left;  padding: 8px;}</style><table style=\"font-family: arial, sans-serif;border-collapse: collapse;  width: 100%;\">  <tr> <th>Advance</th>   <th>0-30</th>    <th>30-60</th>    <th>60-90</th>    <th>90-120</th>    <th>120 Above</th>  </tr>  <tr>  <td>"+ format_currency(data['advance'], erpnext.get_currency(cur_frm.doc.company))+"</td>    <td>"+ format_currency(data['range1'], erpnext.get_currency(cur_frm.doc.company))+"</td>    <td>"+format_currency(data['range2'], erpnext.get_currency(cur_frm.doc.company)) +"</td>    <td>"+ format_currency(data['range3'], erpnext.get_currency(cur_frm.doc.company)) +"</td>    <td>"+ format_currency(data['range4'], erpnext.get_currency(cur_frm.doc.company))+"</td>    <td>"+format_currency(data['range5'], erpnext.get_currency(cur_frm.doc.company))+"</td>  </tr> </table>")
        }
    });
}

function get_outstanding_amt(){
    frappe.call({
        method: "dhupar_group.custom_actions.get_outstanding_amt",
        args: {"customer": cur_frm.doc.customer},
        callback: function(r) {
            var data = r.message

            if (data == null){
                data = 0;
            }

            var outstanding_amount = cur_frm.get_field("custom_total_outstanding")
            outstanding_amount.set_value("<style>table {  font-family: arial, sans-serif;  border-collapse: collapse;  width: 100%;}td, th {  border: 1px solid #dddddd;  text-align: left;  padding: 8px;}</style><table style=\"font-family: arial, sans-serif;border-collapse: collapse;  width: 100%;\">  <br> <tr>    <td width='50%'>Total Outstanding</td>  <td width='50%'>"+format_currency(data, erpnext.get_currency(cur_frm.doc.company))+"</td> </tr> </table>")
        }
    });
}

// get total pdc amt (3 month)
function get_pdc_data(){
    frappe.call({
        method: "dhupar_group.custom_actions.get_pdc_data",
        args: {"customer" : cur_frm.doc.customer},
        callback: function(r) {
            var data = r.message[0];
            // console.log(data['pdc_amt']);
            if (data['pdc_amt'] == null){
                data['pdc_amt'] = 0;
            }

            var pdc_field = cur_frm.get_field("custom_pdc_amount")
            pdc_field.set_value("<style>table {  font-family: arial, sans-serif;  border-collapse: collapse;  width: 100%;}td, th {  border: 1px solid #dddddd;  text-align: left;  padding: 8px;}</style><table style=\"font-family: arial, sans-serif;border-collapse: collapse;  width: 100%;\">  <br> <tr>    <td>PDC Amount</td>  <td>"+ format_currency(data['pdc_amt'], erpnext.get_currency(cur_frm.doc.company)) +"</td> </tr> </table> <br>")
        }
    });
}

// on Click Check PDC 
frappe.ui.form.on("Sales Order", "custom_check_pdc", function (frm){
    if(cur_frm.doc.customer){
        frappe.call({
            method: "dhupar_group.custom_actions.check_pdc",
            args: {"customer": cur_frm.doc.customer},
            callback: function(r) {
                // console.log(r.message)

                if (r.message[0].length > 0){
                    frappe.msgprint(`
                        <div style="height: 400px; overflow-y: auto;overflow-x:auto margin-bottom: 10px;" class="table-wrapper-scroll-y">
                            <table style="width:100%;" class="table table-bordered table-hover table-sm">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Party</th>
                                        <th>Cheque/Reference Date</th>
                                        <th>Amount</th>
                                    </tr>
                                </thead>
                                <tbody id="check_pdc_table">

                                </tbody
                            </table>
                        </div>`);

                    var table = document.getElementById("check_pdc_table");
                    for (var j = 0; j < r.message.length; j++) {
                        for (var i = 0; i < r.message[j].length; i++) {
                            var newRow = table.insertRow(table.rows.length);

                            newRow.innerHTML = "<td>" + r.message[j][i]['name'] + "</td>" +
                                "<td>" + r.message[j][i]['party'] + "</td>" +
                                "<td>" + r.message[j][i]['reference_date'] + "</td>" +
                                "<td>" + r.message[j][i]['paid_amount'] + "</td>" 
                        }
                    }
                }else{
                    frappe.msgprint("PDC Data is not available")
                }
            }
        })
    }
});


// Workflow - SO Approval
frappe.ui.form.on('Sales Order', {

    after_workflow_action: function(frm) {

        // If Reject
        if ((frm.doc.workflow_state === 'Rejected') && (frappe.user.has_role('Sales Manager')))
        {
            // frm.set_df_property('custom_reason','reqd',1);

            let d = new frappe.ui.Dialog({
                title: 'Reason For Hold/Rejection',
                fields: [
                    {
                        label: 'Enter Reason For Rejection',
                        fieldname: 'custom_reason',
                        fieldtype: 'Data'
                    },
                ],
                size: 'small', // small, large, extra-large 
                primary_action_label: 'Submit',
                primary_action(values) {
                    console.log(values)
                    frm.set_value('custom_reason',values.custom_reason);
                    d.hide();
                    frm.save()
                }
            });
            d.show();
        }

        // If Pending For Payment
        if ((frm.doc.workflow_state === 'Pending For Payment')) 
        {
            frm.set_df_property('custom_reason','reqd',1);
            frappe.db.set_value('Sales Order',frm.doc.name,'custom_reason',frm.doc.workflow_state)
            frm.refresh_field('custom_reason')
            frappe.db.commit()
        }

        // If Pending For Price Approval
        if ((frm.doc.workflow_state === 'Pending For Price Approval'))
        {
            frm.set_df_property('custom_reason','reqd',1);

            let d = new frappe.ui.Dialog({
                title: 'Reason For Hold/Rejection',
                fields: [
                    {
                        label: 'Enter Reason',
                        fieldname: 'custom_reason',
                        fieldtype: 'Data'
                    },
                ],
                size: 'large', // small, large, extra-large
                primary_action_label: 'Submit',
                primary_action(values) {
                    frm.set_value('custom_reason',values.custom_reason);
                    d.hide();
                    frm.save()
                }
            });
            d.show();
        }

        // If Sent For Review
        if ((frm.doc.workflow_state === 'Sent For Review'))
        {
            frm.set_df_property('custom_reason','reqd',1);
            frappe.db.set_value('Sales Order',frm.doc.name,'custom_reason','')
            frm.refresh_field('custom_reason')
            frappe.db.commit()
        }
    }
});


// To send company certificates to customer (if customer request)
// In salse order added menu button Send Company Certificates
frappe.ui.form.on('Sales Order', {
    refresh: function(frm) {
        // Add a custom button to the menu
        frm.page.add_menu_item('Send Company Documents', function() {
            
            let d = new frappe.ui.Dialog({
            title: 'Select documents to send',
            fields: [
                {
                    label: 'PAN CARD',
                    fieldname: 'pan_card',
                    fieldtype: 'Check'
                },
                {
                    label: 'DHUPAR CORPORATE',
                    fieldname: 'dhupar_corporate',
                    fieldtype: 'Check'
                },
                {
                    label: 'UDYAM REGISTRATION CERTIFICATE',
                    fieldname: 'udyam_certificate',
                    fieldtype: 'Check'
                },
                {
                    label: 'PUN AUTHORISED STOKIEST CERTIFICATE DBTPL_2023',
                    fieldname: 'stokist_certificate',
                    fieldtype: 'Check'
                },
                {
                    fieldtype: 'Column Break'
                },
                {
                    label: 'GOOGLE PAY SCANNER',
                    fieldname: 'gpay_scanner',
                    fieldtype: 'Check'
                },
                {
                    label: 'DBTPL GST CERTIFICATE',
                    fieldname: 'gst_certificate',
                    fieldtype: 'Check'
                },
                
                {
                    label: 'KOTAK BANK DETAILS WITH CANCELLED CHEQUE',
                    fieldname: 'kotak_bank_details',
                    fieldtype: 'Check'
                },
                {
                    label: 'PUN AUTHORISED SERVICE CENTER CERTIFICATE DBTPL_2023',
                    fieldname: 'aut_service_center_certificate',
                    fieldtype: 'Check',
                },
                {
                    fieldtype: 'Section Break'
                },
                {
                    label: 'Enter Email Id',
                    fieldname: 'email_id',
                    fieldtype: 'Data',
                    reqd: 1
                }
            ],
            size: 'small', // small, large, extra-large 
            primary_action_label: 'Send Mail',
            primary_action(values) {
                frappe.call({
                method: 'dhupar_group.custom_actions.send_company_documents1',
                args: {
                    'pan_card': values.pan_card,
                    'dhupar_corporate': values.dhupar_corporate,
                    'gpay_scanner': values.gpay_scanner,
                    'gst_certificate': values.gst_certificate,
                    'udyam_certificate': values.udyam_certificate,
                    'kotak_bank_details': values.kotak_bank_details,
                    'stokist_certificate': values.stokist_certificate,
                    'aut_service_center_certificate': values.aut_service_center_certificate,
                    'email_id': values.email_id
                },
                callback: function(response) {
                    if (response.message) {
                        frappe.msgprint('Documents sent successfully!');
                    }
                }
            });
                d.hide();
            }
        });
        d.show();
        });
    }
});