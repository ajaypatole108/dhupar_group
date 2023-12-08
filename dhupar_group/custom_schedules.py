# License: GNU General Public License v3. See license.txt

from __future__ import unicode_literals
from ast import Pass
from datetime import datetime
import frappe
import json
import copy
import frappe.utils
from frappe.utils import cstr, flt, getdate, cint, nowdate, add_days, get_link_to_form
from frappe import _
from six import string_types
from frappe.model.utils import get_fetch_values
from frappe.model.mapper import get_mapped_doc
from dhupar_group.custom_actions import get_debtor_days
from calendar import monthrange
from frappe.utils import add_days


def update_dso():

    data = frappe.db.sql(
				"""
				SELECT name
				FROM `tabCustomer`
				ORDER BY name
			""",
				as_dict=1,
			)
    
    for i in data:
        frappe.db.set_value("Customer", {"name": i['name']}, "debtor_days", get_debtor_days(i['name']))

    frappe.db.commit()

# ------------------------------------------ Close 3 month Older Draft Sales_Order-----------------------------
# daily Schedular --> hooks.py --> dhupar_group.custom_schedules

def close_3month_older_sales_order(): # This function close the 3 month older sales_order whose status is draf
    sales_order_no = frappe.db.sql(f"""
                                    	SELECT name,modified,status
                                        FROM `tabSales Order`
                                        WHERE status = 'Draft' AND modified < DATE(NOW() - INTERVAL 3 MONTH)
                                    """,as_dict=1)
 
    for i in sales_order_no:
        frappe.db.set_value('Sales Order',{"name": i['name']},'status','Cancelled')
        frappe.db.set_value('Sales Order',{"name": i['name']},'workflow_state','Cancelled')
        frappe.db.set_value('Sales Order',{"name": i['name']},'docstatus','2')

    frappe.db.commit()

# ---------------------------------------- /Close 3 month oder Draft Sales_Order-----------------------------

# This function close the sales order whose bill and delivery done but status is still open because of non-stockable items
def close_open_sales_order():
    sales_order_data = frappe.db.sql(f"""
                                SELECT DISTINCT(soi.parent) as name
                                FROM `tabSales Order Item` soi join `tabSales Order` so
                                ON so.name = soi.parent
                                JOIN `tabSales Invoice Item` sii on sii.sales_order = so.name
                                JOIN `tabSales Invoice` si on si.sales_order_reference_no = so.name
                                JOIN `tabItem` item on sii.item_code = item.item_code
                                WHERE item.is_stock_item = 0
                                and si.status = 'Paid'
                                and so.status not in ('Closed','To Deliver and Bill','Completed','To Deliver')
                                and si.docstatus = 1
						""",as_dict=1)
    for i in sales_order_data:
        frappe.db.set_value("Sales Order", i.name, "status", "Closed")
    frappe.db.commit()


# This function close the older 3 days pending sales order which is created by Counter_User
# n8n Trigger --> Close Sales Order (Counter)
@frappe.whitelist()
def close_counter_sales_order():
    sales_orders = frappe.db.sql(f"""
                                    SELECT 
                                        so.name,
                                        so.status,
                                        so.transaction_date
                                    FROM
                                        `tabSales Order` so
                                    JOIN
                                        `tabSales Order Item` soi
                                    ON
                                        so.name = soi.parent
                                    WHERE
                                        so.naming_series = 'SO-C-'
                                        AND so.status NOT IN ('completed','Closed','Cancelled')
                                        AND DATEDIFF(CURDATE(), so.transaction_date) > 3
                                    GROUP BY
                                        so.name
                                """,as_dict=1)
    for i in sales_orders:
        frappe.db.set_value("Sales Order", i.name, "status", "Closed")
    frappe.db.commit()
