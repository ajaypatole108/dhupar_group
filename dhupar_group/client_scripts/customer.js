frappe.ui.form.on("Customer",{
    refresh: function(frm) {
            frm.add_custom_button(__('Send Ledger'), function() {
                let d = new frappe.ui.Dialog({
                title: 'Send Ledger',
                fields: [
                    {
                        label: 'Customer Name',
                        fieldname: 'customer',
                        fieldtype: 'Read Only',
                        default: frm.doc.customer_name
                    },
                    {
                        fieldtype: 'Section Break'
                    },
                    {
                        label: 'From Date',
                        fieldname: 'from_date',
                        fieldtype: 'Date'
                    },
                    {
                        fieldtype: 'Column Break'
                    },
                    {
                        label: 'To Date',
                        fieldname: 'to_date',
                        fieldtype: 'Date'
                    },
                    {
                        fieldtype: 'Section Break'
                    },
                    {
                        label: 'Mobile',
                        fieldname: 'mobile',
                        fieldtype: 'Data'
                    },
                    {
                        label: 'Email Id',
                        fieldname: 'email_id',
                        fieldtype: 'Data',
                        reqd: 1
                    },
                ],
                size: 'small', // small, large, extra-large 
                primary_action_label: 'Send Ledger',
                primary_action(values) {
                    frappe.call({
                    method: 'dhupar_group.send_ledger.send_ledger.send_ledger',
                    args: {
                        'customer': values.customer,
                        'from_date': values.from_date,
                        'to_date': values.to_date,
                        'email_id': values.email_id,
                        'mobile': values.mobile
                    },
                    callback: function(response) {
                        if (response.message) {
                            frappe.msgprint('Documents sent successfully!', alert_type='success');
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