frappe.ui.form.on("Sales Invoice", {
    before_submit: function(frm) {
        if (frm.doc.naming_series === "DSR2324.######") {
            frm.set_value('distance','');
            frm.set_value('vehicle_no','');
        }
    }
});

// frappe.ui.form.on("Sales Invoice", {
//     before_submit: function(frm) {
//         if (!frm.doc.irn) {
//             frappe.msgprint("IRN has not been generated. Please generate the IRN before submitting the invoice.");
//             frappe.validated = false;
//         }
//     }
// });

// This Code Check The IRN is generated or not
// frappe.ui.form.on("Sales Invoice", {
//     before_submit: function(frm){
//         var data = frappe.db.get_doc("Customer",cur_frm.doc.customer)
//         .then(r => {
//             if (r.gst_category === "Registered Regular"){
//                 if (!frm.doc.irn) {
//                     frappe.msgprint("IRN has not been generated. Please generate the IRN before submitting the invoice.");
//                     frappe.validated = false;
//                 }
//             }else{
//                 frappe.validated = true;
//             }
//         });
//     }
// });

// aj- This Function Check Customer tcs_enable or not
frappe.ui.form.on("Sales Invoice", "onload", function (frm) {
    frappe.call({
        method: "dhupar_group.custom_actions.check_tcs",
        args: {party_type: 'Customer', party: cur_frm.doc.customer},
        callback: function(r) {
            // cur_frm.doc.no_tcs = r.message;
            // console.log(r.message);
            cur_frm.set_value('no_tcs',r.message);
            cur_frm.refresh();
        }
    });
});



// Recalculating Payment Due Date From Invoice Date
frappe.ui.form.on("Sales Invoice", "validate", function (frm) {
    if(cur_frm.doc.is_pos != 1){
        if(cur_frm.doc.is_return != 1){
            frappe.db.get_doc("Payment Term",cur_frm.doc.payment_terms_template,"credit_days")
            .then(r => {
                // console.log(r.credit_days);
                let payment_schedule = cur_frm.doc.payment_schedule;
        
                for (let i = 0; i < payment_schedule.length; i++) {
                    var due_date_new = frappe.datetime.add_days(cur_frm.doc.posting_date, r.credit_days);
                    payment_schedule[i]['due_date'] = due_date_new;
                    frappe.model.set_value(cur_frm.doctype, cur_frm.docname,"due_date",due_date_new);
                    cur_frm.refresh_field('due_date');
                }
            });
        }
    }
});


frappe.ui.form.on("Sales Invoice", "validate", function (frm){
    if(cur_frm.doc.taxes_and_charges != "SEZ - DBTPL" && cur_frm.doc.taxes_and_charges != "SEZ IGST - DBTPL" && cur_frm.doc.taxes_and_charges != "Export - DBTPL" && cur_frm.doc.taxes_and_charges != "GST INSTATE AT 12% - DBTPL" && cur_frm.doc.taxes_and_charges != "No Tax - DBTPL"){
        frappe.call({
            method: 'frappe.client.get_value',
            args: {
                'doctype': 'Address',
                'filters': {'name': cur_frm.doc.customer_address},
                'fieldname': [
                    'gst_state_number'
                ]
            },
            callback: function(r) {
                var billing_this_year= 0;

                if (r.message.gst_state_number != 27) {
                    cur_frm.clear_table("taxes");
                    cur_frm.refresh_fields();
                    cur_frm.doc.taxes_and_charges = "Out of State GST - DBTPL";
                    
                    var newrow = frappe.model.add_child(cur_frm.doc, "Sales Taxes and Charges", "taxes");
                    newrow.charge_type = "On Net Total";
                    newrow.account_head = "Output Tax IGST - DBTPL";
                    newrow.description = "Output Tax IGST";

                    cur_frm.refresh();
                }
                else{
                    cur_frm.clear_table("taxes");
                    cur_frm.refresh_fields();
                    cur_frm.doc.taxes_and_charges = "In State GST - DBTPL";
                    
                    var newrow = frappe.model.add_child(cur_frm.doc, "Sales Taxes and Charges", "taxes");
                    newrow.charge_type = "On Net Total";
                    newrow.account_head = "Output Tax SGST - DBTPL";
                    newrow.description = "Output Tax SGST";
                    
                    var newrow = frappe.model.add_child(cur_frm.doc, "Sales Taxes and Charges", "taxes");
                    newrow.charge_type = "On Net Total";
                    newrow.account_head = "Output Tax CGST - DBTPL";
                    newrow.description = "Output Tax CGST";
                    
                    cur_frm.refresh();
                }
                // if(cur_frm.doc.customer_present == 1){
                //     var newrow = frappe.model.add_child(cur_frm.doc, "Sales Taxes and Charges", "taxes");
                //     newrow.charge_type = "On Previous Row Total";
                //     newrow.account_head = "TCS @ 0.075% - DBTPL";
                //     newrow.description = "TCS @ 0.075%";
                //     newrow.rate = 0.075;
                //     newrow.row_id = cur_frm.doc.taxes.length - 1
                // }
                frappe.call({
                    method: "dhupar_group.custom_actions.get_dashboard_info",
                    args: {party_type: 'Customer', party: cur_frm.doc.customer},
                    callback: function(r) {
                        var billing_this_year = r.message[0].billing_this_year;
                        var billing_last_year = r.message[0].billing_last_year;
                        
                        if((billing_this_year>5000000 || billing_last_year > 5000000 || cur_frm.doc.total > 4999999) && cur_frm.doc.posting_date > "2021-03-31" && cur_frm.doc.no_tcs === 0 && cur_frm.doc.taxes[cur_frm.doc.taxes.length-1].account_head != "TCS @ 0.1% -Sale - DBTPL"){
                            var newrow = frappe.model.add_child(cur_frm.doc, "Sales Taxes and Charges", "taxes");
                            newrow.row_id = cur_frm.doc.taxes.length - 1;
                            newrow.charge_type = "On Previous Row Total";
                            newrow.account_head = "TCS @ 0.1% -Sale - DBTPL";
                            newrow.description = "TCS @ 0.1% -Sale";
                            newrow.rate = 0.1;
                        }
                        cur_frm.refresh();
                    }
                });
                cur_frm.refresh();
            
            }
        });

    }   
    else{
        frappe.call({
            method: "dhupar_group.custom_actions.get_dashboard_info",
            args: {party_type: 'Customer', party: cur_frm.doc.customer},
            callback: function(r) {
                var billing_this_year = r.message[0].billing_this_year;
                var billing_last_year = r.message[0].billing_last_year;
                if((billing_this_year>5000000 || billing_last_year > 5000000 || cur_frm.doc.total > 4999999) && cur_frm.doc.posting_date > "2021-03-31" && cur_frm.doc.no_tcs === 0 && cur_frm.doc.taxes[cur_frm.doc.taxes.length-1].account_head != "TCS @ 0.1% -Sale - DBTPL"){
                    var newrow = frappe.model.add_child(cur_frm.doc, "Sales Taxes and Charges", "taxes");
                    newrow.row_id = cur_frm.doc.taxes.length - 1;
                    newrow.charge_type = "On Previous Row Total";
                    newrow.account_head = "TCS @ 0.1% -Sale - DBTPL";
                    newrow.description = "TCS @ 0.1% -Sale";
                    newrow.rate = 0.1;
                }
                cur_frm.refresh();
            }
        });
    }
});

// this call redefine to recalculate tcs
// frappe.ui.form.on("Sales Invoice", "onload", function (frm) {
//     frappe.call({
//             method: "dhupar_group.custom_actions.get_dashboard_info",
//             args: {party_type: 'Customer', party: cur_frm.doc.customer},
//             callback: function(r) {
//                 var billing_this_year = r.message[0].billing_this_year;
//                 var billing_last_year = r.message[0].billing_last_year;
//                 if((billing_this_year>5000000 || billing_last_year > 5000000 || cur_frm.doc.total > 4999999) && cur_frm.doc.posting_date > "2021-03-31" && cur_frm.doc.no_tcs === 0 && cur_frm.doc.taxes[cur_frm.doc.taxes.length-1].account_head != "TCS @ 0.1% -Sale - DBTPL"){
//                     var newrow = frappe.model.add_child(cur_frm.doc, "Sales Taxes and Charges", "taxes");
//                     newrow.row_id = cur_frm.doc.taxes.length - 1;
//                     newrow.charge_type = "On Previous Row Total";
//                     newrow.account_head = "TCS @ 0.1% -Sale - DBTPL";
//                     newrow.description = "TCS @ 0.1% -Sale";
//                     newrow.rate = 0.1;
//                 }
//                 cur_frm.refresh();
//             }
//         });
// });


frappe.ui.form.on("Sales Invoice", "onload", function (frm) {
    // cur_frm.set_df_property("naming_series", "read_only", 1);
    if (frm.doc.is_return) {
        if (cur_frm.is_new()) {
            cur_frm.doc.naming_series = "DSR2324.######";
            cur_frm.set_df_property("naming_series", "read_only", 1);
            cur_frm.refresh_field("naming_series");
        }
    }

});

frappe.ui.form.on("Sales Invoice", "validate", function (frm) {
    // cur_frm.set_df_property("naming_series", "read_only", 1);
    if (frm.doc.is_return) {
        if (cur_frm.is_new()) {
            cur_frm.doc.naming_series = "DSR2324.######";
            cur_frm.set_df_property("naming_series", "read_only", 1);
            cur_frm.refresh_field("naming_series");
        }
    }
});

frappe.ui.form.on("Sales Invoice", "validate", function (frm, cdt, cdn) {

    var Current_User = frappe.session.user;
    frappe.call({
        method: "frappe.client.get",
        args: {
            doctype: "User",
            filters: {
                'email': Current_User
            }
        },
        callback: function (r) {
            var branch = r.message.branch;
            var item;

            if (branch == "Pune") {

                $.each(frm.doc.items || [], function (i, v) {
                    cur_frm.doc.items[i].warehouse = "Pune - DBTPL";
                    item = cur_frm.doc.items[i];

                    if (!item.item_tax_rate || item.item_tax_rate == "" || !item.gst_hsn_code || item.gst_hsn_code == "") {
                        // cur_frm.disable_save();
                        frappe.throw(
                            "The item " + item.item_code + " does not have proper tax setup contact admin to proceed"
                        );

                    }

                })

                cur_frm.doc.company_address = "Pune Address-Billing";
                cur_frm.refresh_field("company_address");

            } else if (branch == "Automation") {

                $.each(frm.doc.items || [], function (i, v) {
                    cur_frm.doc.items[i].warehouse = "Automation - DBTPL";
                    item = cur_frm.doc.items[i];

                    if (!item.item_tax_rate || item.item_tax_rate == "" || !item.gst_hsn_code || item.gst_hsn_code == "") {
                        // cur_frm.disable_save();
                        frappe.throw(
                            "The item " + item.item_code + " does not have proper tax setup contact admin to proceed"
                        );

                    }

                })
                cur_frm.doc.company_address = "Pune Address-Billing";
                cur_frm.refresh_field("company_address");

            } else if (branch == "Pimpri") {
                $.each(frm.doc.items || [], function (i, v) {
                    cur_frm.doc.items[i].warehouse = "Pimpri - DBTPL";
                    item = cur_frm.doc.items[i];

                    if (!item.item_tax_rate || item.item_tax_rate == "" || !item.gst_hsn_code || item.gst_hsn_code == "") {
                        // cur_frm.disable_save();
                        frappe.throw(
                            "The item " + item.item_code + " does not have proper tax setup contact admin to proceed"
                        );

                    }

                })
                cur_frm.doc.company_address = "Pimpri-Billing";
                cur_frm.refresh_field("company_address");

            } else if (branch == "Wagholi") {
                $.each(frm.doc.items || [], function (i, v) {
                    cur_frm.doc.items[i].warehouse = "Wagholi - DBTPL";
                    item = cur_frm.doc.items[i];

                    if (!item.item_tax_rate || item.item_tax_rate == "" || !item.gst_hsn_code || item.gst_hsn_code == "") {
                        // cur_frm.disable_save();
                        frappe.throw(
                            "The item " + item.item_code + " does not have proper tax setup contact admin to proceed"
                        );

                    }

                })
                cur_frm.doc.company_address = "Dhupar Brothers Trading Pvt. Ltd.-Permanent";
                cur_frm.refresh_field("company_address");

            } else if (branch == "Mahape") {
                $.each(frm.doc.items || [], function (i, v) {
                    cur_frm.doc.items[i].warehouse = "Mahape - DBTPL";
                    item = cur_frm.doc.items[i];

                    if (!item.item_tax_rate || item.item_tax_rate == "" || !item.gst_hsn_code || item.gst_hsn_code == "") {
                        // cur_frm.disable_save();
                        frappe.throw(
                            "The item " + item.item_code + " does not have proper tax setup contact admin to proceed"
                        );

                    }

                })
                cur_frm.doc.company_address = "DHUPAR NAVI MUMBAI-Billing";
                cur_frm.refresh_field("company_address");
            }
            cur_frm.refresh();
            cur_frm.refresh_field("items");
        }
    })

});


frappe.ui.form.on("Sales Invoice", "get_history", function (frm) {

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

                console.log(r);
                if (r.message[0].length > 0) {
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
                                </tr>
                            </thead>
                            <tbody id="history-table">
                                
                            </tbody
                        </table>
                    </div>`);

                    var table = document.getElementById("history-table");

                    // console.log(r.message[0].length);

                    for (j = 0; j < r.message.length; j++) {
                        for (i = 0; i < r.message[j].length; i++) {
                            var newRow = table.insertRow(table.rows.length);
                            newRow.innerHTML = "<td>" + moment(r.message[j][i][0]).format('MM/DD/YYYY') + "</td>" +
                                "<td>" + r.message[j][i][1] + "</td>" +
                                "<td>" + r.message[j][i][2] + "</td>" +
                                "<td>" + r.message[j][i][4] + "</td>" +
                                "<td>" + r.message[j][i][3] + "</td>" +
                                "<td>" + r.message[j][i][5] + "</td>"
                        }
                    }
                } else {
                    frappe.msgprint("Neves Sold to " + cur_frm.doc.customer_name)
                }
            }
        });

    }

});

frappe.ui.form.on("Sales Invoice", "validate", function (frm) {

    for (var i = 0; i < cur_frm.doc.items.length; i++) {

        if (cur_frm.doc.items[i].sales_order == null && cur_frm.doc.is_pos == 0 && cur_frm.doc.is_return == 0 && cur_frm.doc.customer_present == 0 
            && !cur_frm.doc.items[i].item_code.toLowerCase().includes("transport") ) {
            frappe.validated = false;
            frappe.throw("No Sales Order for Item " + cur_frm.doc.items[i].item_code);
        }
    }

    var items = []; 
    for (var k = 0; k < cur_frm.doc.items.length ; k++){
        var item = cur_frm.doc.items[k];
        var item = {
            "hsn_code": item.gst_hsn_code,
            "tax_rate": JSON.parse(item.item_tax_rate),
            "amount": item.amount,
        }
        items.push(item);
    }       
    for (var i = 0; i < items.length; i++) {
        for (var j = i + 1; j < items.length; j++) {
            if (items[i].hsn_code == items[j].hsn_code && items[i].tax_rate["CGST - DBTPL"] == items[j].tax_rate["CGST - DBTPL"]) {
                items[i].amount = items[i].amount + items[j].amount;
                items.splice(j, 1);
                break;
            }
        }
    }

    for (var i = 0; i < items.length; i++) {
        for (var j = 0; j < cur_frm.doc.taxes.length; j++){
            var item = cur_frm.doc.taxes[j]
            if (items[i].tax_rate.hasOwnProperty(item.account_head)) {
                items[i][item.account_head] = (items[i].amount * items[i].tax_rate[item.account_head]) / 100;
            } else {
                items[i][item.account_head] = (items[i].amount * item.rate) / 100;
            } 
        }
    }
                        

    var table_head = document.createElement("thead");
    var tr = table_head.insertRow(0),
        th = document.createElement('th');
    th.innerHTML = "HSN/SAC";
    th.classList.add("text-left");
    tr.appendChild(th);
    var th = document.createElement('th');
    th.innerHTML = "Taxable Amount";
    th.classList.add("text-right");
    tr.appendChild(th);
    for (var i = 0; i < cur_frm.doc.taxes.length; i++){
        var item = cur_frm.doc.taxes[i]
        var th = document.createElement('th');
        th.innerHTML = item.description;
        th.classList.add("text-right");
        tr.appendChild(th); 
    }

    var table = document.createElement("tbody");
    for (var i = 0; i < items.length; i++) {
        var row = table.insertRow(0);
        var cell = document.createElement("td");
        cell.innerHTML = items[i].hsn_code;
        row.appendChild(cell);
        var cell1 = document.createElement("td");
        cell1.innerHTML = items[i].amount.toLocaleString('en-IN', {
            maximumFractionDigits: 2,
            style: 'currency',
            currency: 'INR'
        });
        cell1.classList.add("text-right");
        row.appendChild(cell1);
        for (var j = 0; j < cur_frm.doc.taxes.length; j++){
            var item = cur_frm.doc.taxes[j]
            var cell = document.createElement("td");
            cell.innerHTML = "(%" + items[i].tax_rate[item.account_head] + ") " + items[i][item.account_head].toLocaleString('en-IN', {
                maximumFractionDigits: 2,
                style: 'currency',
                currency: 'INR'
            });

            cell.classList.add("text-right");
            row.appendChild(cell); 
        }
    }

    cur_frm.doc.other_charges_calculation = `<div class="tax-break-up" style="overflow-x: auto;">
                                <table class="table table-bordered table-hover">
                                    ` + table_head.innerHTML + table.innerHTML +`
                                </table>
                            </div>`.trim()
    cur_frm.refresh_field("other_charges_calculation");
});
//cur_frm.add_fetch("customer_address","email_id", "address_email");

frappe.ui.form.on("Sales Invoice", "onload", function (frm){
    var x = document.getElementsByClassName("grid-row-check pull-left");
    for(var i=0; i<x.length;i++)
    {
        x[i].removeAttribute('disabled');
    }
    
});


//aj
frappe.ui.form.on('Sales Invoice',{
	validate: function(frm) {
	    if (cur_frm.doc.grand_total == 0){
	       frappe.throw("Grand Total Can't be Zero");
	    }
    }
});

// Reset due date as per template
frappe.ui.form.on("Sales Invoice", "validate", function (frm){
    var i = cur_frm.doc.payment_terms_template;
    cur_frm.set_value("payment_terms_template","")
    cur_frm.set_value("payment_terms_template",i)
});

