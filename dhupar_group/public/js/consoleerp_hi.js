frappe.provide("erpnext");

$.extend(erpnext, {
    //call from Report: Ordered Items To Be Delivered.(When Close button click)
    consoleerp_hi: function (data) {
        frappe.confirm('Are you sure you want to close the sales order?',
            () => {
                    frappe.call({
                        method: "erpnext.selling.doctype.sales_order.sales_order.update_status",
                        args: {
                            status: "Closed",
                            name: data
                        },
                        callback: function (r) {
                            frappe.msgprint({
                                title: __('Notification'),
                                indicator: 'green',
                                message: __('Sales Order Closed Successfully')
                            });
                        }
                    });
            }, () => {
                // action to perform if No is selected
            }
        )
    },

    //Report - Draft Sales Order (Last 3 Months)
    close_sales_order2: function(data){
        frappe.confirm('Are you sure you want to close the sales order?',
            () => {
                frappe.call({
                    method: "reservation_system.custome_actions.update_sales_order_status_to_cancel",
                    args: {
                        name: data
                    },
                    callback: function (r) {
                        // frappe.msgprint("closed " + data);
                        frappe.msgprint({
                            title: __('Notification'),
                            indicator: 'green',
                            message: __('Sales Order Closed Successfully')
                        });
                    }
                });
            }, () => {
                // action to perform if No is selected
            }
        )
    }
});