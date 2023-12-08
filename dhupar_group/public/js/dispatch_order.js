function dispatch(data) {
    frappe.call({
        method: "dhupar_group.remainder_automation.outstanding.fetch_dispatch_data",
        args: {
            name: data
        },
        callback: function (r) { 
            if (r.message){
                // console.log(r.message)
                let d = new frappe.ui.Dialog({
                    title: 'Enter Dispatch details',
                    fields: [
                        {
                            label: 'Sales Order Number',
                            fieldname: 'name',
                            fieldtype: 'Data',
                            default: `${r.message.name}`,
                            read_only:1
                        },
                        {
                            label: 'Customer',
                            fieldname: 'customer',
                            fieldtype: 'Data',
                            default: `${r.message.customer}`,
                            read_only:1
                        },
                        {
                            label: 'Date',
                            fieldname: 'date',
                            fieldtype: 'Date',
                            default: `${r.message.date}`,
                            read_only:1
                        },
                        {
                            label: "Customer's Purchase Order No",
                            fieldname: 'po_no',
                            fieldtype: 'Data',
                            default: `${r.message.po_no}`,
                            read_only:1
                        },
                        {
                            label: 'Customer Contact Person',
                            fieldname: 'contact_person',
                            fieldtype: 'Data',
                            reqd: 1
                        },
                        {
                            label: 'Transport Payment',
                            fieldname: 'transport_payment',
                            fieldtype: 'Select',
                            options: "\nTransporter Paid\nTransporter To Pay\nOur Vehicle/ Rented Vehicle\nCustomer Will Pick",
                        },
                        {   
                            label: 'Delivery Type',
                            fieldname: 'delivery_type',
                            fieldtype: 'Select',
                            options:"\nDoor Delivery\nGodown Delivery",
                            depends_on: 'eval:doc.transport_payment == "Transporter Paid" || doc.transport_payment == "Transporter To Pay"',
                        },
                        {
                            label: 'Customer Vehicle Number and Contact',
                            fieldname: 'customer_vehicle',
                            fieldtype: 'Data',
                            depends_on: 'eval:doc.transport_payment == "Customer Will Pick"',
                        },
                        {
                            label: 'Special Instructions',
                            fieldname: 'special_instructions',
                            fieldtype: 'Data'
                        },
                        {
                            label: 'Sales Order Link',
                            fieldname: 'link',
                            fieldtype: 'Link',
                            default:'https://erp.dhupargroup.com/app/sales-order/' + `${r.message.name}`,
                            read_only:1,
                            hidden:1
                        },
                    ],
                });
                d.set_primary_action(__("Send To Trello"), function (values){
                    d.hide();
                    console.log(values);

                    frappe.call({
                        method: 'dhupar_group.custom_actions.send_to_trello',
                        args:{
                            "link": values.link,
                            "name": values.name,
                            "customer": values.customer,
                            "date": values.date,
                            "po_no": values.po_no,
                            "contact_person": values.contact_person,
                            "transport_payment": values.transport_payment,
                            "delivery_type": values.delivery_type,
                            "customer_vehicle": values.customer_vehicle,
                            "special_instructions": values.special_instructions
                        },
                        callback: function(r) { 
                            if (!r.exc) {
                                frappe.msgprint('Dispatched')
                            }
                        }
                    });
                });
                d.show();
            }
        }
    });
}