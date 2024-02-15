import frappe
import json
import logging

# logging.basicConfig(filename='get_history.log', level=logging.INFO, format='%(asctime)s - %(message)s', datefmt='%d-%b-%y %H:%M:%S')

@frappe.whitelist()
def get_item_history(customer, items, items_array, invoice):
    # logging.info(customer)
    # logging.info(items)
    # logging.info(items_array)
    # logging.info(invoice)

    items = json.loads(items)
    # logging.info('items')
    # logging.info(items)

    items = [str(i['item_code']) for i in items if i['name'] in items_array]

    # logging.info('items1')
    # logging.info(items)

    invoices =  frappe.db.sql("select name from `tabSales Invoice` where customer_name = '%s'" % str(customer))
    # logging.info('invoice')
    # logging.info(invoices)

    k = [ str(i[0]) for i in invoices]
    if invoice in k :
        k.remove(invoice)

    # logging.info('k')
    # logging.info(k)
    format_invoices = ','.join(['\'%s\''] * len(k))
    result = []

    for item in items:
        result1 = frappe.db.sql("""select creation, item_code, item_name, qty, price_list_rate, discount_percentage 
                                    from `tabSales Invoice Item` 
                                    where parent in ({invoices}) and item_code = ('{items}')
                                    ORDER BY creation desc limit 5""".format(invoices = format_invoices % tuple(k), items = item))

        last_purchase_data1 = frappe.db.sql(f"""
                                SELECT last_purchase_rate
                                FROM `tabItem`
                                WHERE item_code = '{item}'
                                """)
        final = [it1 + last_purchase_data1[0] for it1 in result1]

        result.append(final)

    if len(result[0]) != 0:
        return result
    else:
        result4 = []

        for item in items:
            last_purchase_data1 = frappe.db.sql(f"""
                                    SELECT item_code, item_name,last_purchase_rate
                                    FROM `tabItem`
                                    WHERE item_code = '{item}'
                                    """)
            result4.append(last_purchase_data1)
        return result4
