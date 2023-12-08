
frappe.ui.form.on("Sales Order", {
	after_save(frm) {
        frappe.call({
            method:"dhupar_group.remainder_automation.outstanding.update_email_id",
            args: {
                "customer_name1": frm.doc.customer,
				"billing_email_id1":frm.doc.billing_email_id,
            },
            callback : function(r) {
               if (r.message){
                    console.log(r.message)
               }
            },
        })
	}
});