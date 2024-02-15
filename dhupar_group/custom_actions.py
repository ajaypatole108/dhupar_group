# License: GNU General Public License v3. See license.txt

from __future__ import unicode_literals
from ast import Pass
from datetime import datetime
import frappe
import json
import re
import os
import copy
import math
import frappe.utils
from frappe import utils
from frappe.utils import cstr, flt, getdate, cint, nowdate, add_days, get_link_to_form
from frappe import _
from six import string_types
from frappe.model.utils import get_fetch_values
from frappe.model.mapper import get_mapped_doc
from frappe.desk import query_report
from erpnext.stock.stock_balance import update_bin_qty, get_reserved_qty
from frappe.desk.notifications import clear_doctype_notifications
from frappe.contacts.doctype.address.address import get_company_address
from erpnext.selling.doctype.customer.customer import check_credit_limit
from erpnext.stock.doctype.item.item import get_item_defaults
from erpnext.accounts.utils import get_fiscal_year, get_balance_on
from erpnext.setup.doctype.item_group.item_group import get_item_group_defaults
from erpnext.accounts.report.accounts_receivable_summary.accounts_receivable_summary import execute as get_ageing
from calendar import monthrange
from datetime import datetime, timedelta
import requests
import logging
from frappe.utils.file_manager import get_file
from frappe.utils.pdf import get_pdf
from frappe.core.api.file import (
	get_files_in_folder
)

logging.basicConfig(filename='smartshop.log', level=logging.INFO, format='%(asctime)s - %(message)s', datefmt='%d-%b-%y %H:%M:%S')

@frappe.whitelist()
def make_pick_list(source_name, target_doc=None):
    def post_process(source, doc):
        doc.purpose = "Pick List"		

    def update_item(source, target, source_parent):
        target.project = source_parent.project
        target.qty = flt(source.qty) - flt(source.delivered_qty)

    doc = get_mapped_doc("Sales Order", source_name, {
        "Sales Order": {
            "doctype": "Stock Entry",
            "validation": {
                "docstatus": ["=", 1]
            },
            "field_map": {
                "sales_order_no": "sales_order"
            }
            },

        "Sales Order Item": {
            "doctype": "Stock Entry Detail",
            "field_map": {
                "name": "sales_order_item",
                "parent": "sales_order",
                "stock_uom": "uom",
                "stock_qty": "qty"
            },
            "postprocess": update_item,
            "condition": lambda doc: abs(doc.delivered_qty) < abs(doc.qty) and doc.delivered_by_supplier!=1
        }
    }, target_doc, post_process)

    return doc

@frappe.whitelist()
def make_put_list(source_name, target_doc=None):
    def post_process(source, doc):
        doc.purpose = "Put List"

    def update_item(source, target, source_parent):
        target.project = source_parent.project

    doc = get_mapped_doc("Purchase Receipt", source_name, {
        "Purchase Receipt": {
            "doctype": "Stock Entry",
            "validation": {
                "docstatus": ["=", 1]
            },
            "field_map": {
                "purchase_receipt_no": "purchase_receipt"
            }
            },

        "Purchase Receipt Item": {
            "doctype": "Stock Entry Detail",
            "field_map": {
                "name": "purchase_receipt_item",
                "stock_uom": "uom",
                "stock_qty": "qty"
            },
        }
    }, target_doc, post_process)

    return doc

@frappe.whitelist()
def get_dashboard_info(party_type, party, loyalty_program=None):
    current_fiscal_year = get_fiscal_year(nowdate(), as_dict=True)

    doctype = "Sales Invoice"

    companies = frappe.get_all(doctype, filters={
        'docstatus': 1,
        party_type.lower(): party
    }, distinct=1, fields=['company'])

    company_wise_info = []

    company_wise_grand_total = frappe.get_all(doctype,
        filters={
            'docstatus': 1,
            party_type.lower(): party,
            'posting_date': ('between', [current_fiscal_year.year_start_date, current_fiscal_year.year_end_date])
            },
            group_by="company",
            fields=["company", "sum(grand_total) as grand_total", "sum(base_grand_total) as base_grand_total"]
        )

    company_wise_grand_total_last_year = frappe.get_all(doctype,
        filters={
            'docstatus': 1,
            party_type.lower(): party,
            'posting_date': ('between', [frappe.utils.add_days(current_fiscal_year.year_start_date,-365), frappe.utils.add_days(current_fiscal_year.year_end_date,-365)])
            },
            group_by="company",
            fields=["company", "sum(grand_total) as grand_total", "sum(base_grand_total) as base_grand_total"]
        )

    company_wise_billing_this_year = frappe._dict()
    company_wise_billing_last_year = frappe._dict()
    for d in company_wise_grand_total:
        company_wise_billing_this_year.setdefault(
            d.company,{
                "grand_total": d.grand_total,
                "base_grand_total": d.base_grand_total
            })

    for d in company_wise_grand_total_last_year:
        company_wise_billing_last_year.setdefault(
            d.company,{
                "grand_total": d.grand_total,
                "base_grand_total": d.base_grand_total
            })

    for d in companies:

        billing_this_year = flt(company_wise_billing_this_year.get(d.company,{}).get("grand_total"))
        billing_last_year = flt(company_wise_billing_last_year.get(d.company,{}).get("grand_total"))

        info = {}
        info["billing_this_year"] = flt(billing_this_year) if billing_this_year else 0
        info["billing_last_year"] = flt(billing_last_year) if billing_last_year else 0
        info["company"] = d.company

        company_wise_info.append(info)

    return company_wise_info

@frappe.whitelist()
def get_ageing_data(customer,company="Dhupar Brothers Trading Pvt. Ltd."):
    ageing_filters = frappe._dict({
        'company': company,
        'report_date': nowdate(),
        'ageing_based_on': "Posting Date",
        'range1': 30,
        'range2': 60,
        'range3': 90,
        'range4': 120,
        'party': (customer,)
    })

    col1, ageing = get_ageing(ageing_filters)
    return ageing


@frappe.whitelist()
def get_pdc_data(customer):
    current_date = datetime.now()
    three_months_ago = current_date - timedelta(days=90)

    data = frappe.db.sql(f"""
                        SELECT sum(paid_amount) as pdc_amt FROM `tabPayment Entry`
                        WHERE docstatus != 2 
                        AND workflow_state = "PDC" 
                        AND party = '{customer}'
                        AND reference_date >= '{three_months_ago}'
                    """,as_dict=1)
    return data

# This Function gives outstanding amt and display in sales order under payment details
@frappe.whitelist()
def get_outstanding_amt(customer):
    outstanding = query_report.run(report_name = "Accounts Receivable",filters= {"company":"Dhupar Brothers Trading Pvt. Ltd.","party": (customer,) ,"report_date":datetime.today().strftime('%Y-%m-%d'),"ageing_based_on":"Posting Date","range1":30,"range2":60,"range3":90,"range4":120},ignore_prepared_report= True)
    outstanding = outstanding['result']

    if len(outstanding) != 0:
        return outstanding[-1][12]

@frappe.whitelist()
def check_pdc(customer):
    current_date = datetime.now()
    three_months_ago = current_date - timedelta(days=90)

    data = frappe.db.sql(f"""
                            SELECT name, party,reference_date, paid_amount FROM `tabPayment Entry`
                            WHERE docstatus != 2 
                            AND workflow_state = "PDC" 
                            AND party = '{customer}'
                            AND reference_date >= '{three_months_ago}'
                        """,as_dict=1)
    result = []
    if len(data) != 0:
        for i in data:
            result.append(i)

    return [(result)]



@frappe.whitelist()
def get_debtor_days(customer):

    outstanding = get_balance_on(date = nowdate(), party_type = 'Customer', party = customer)

    data = frappe.db.sql(
                """
                SELECT posting_date as "month", rounded_total as "total"
                FROM `tabSales Invoice`
                WHERE customer = %s AND docstatus = 1
                ORDER BY posting_date DESC
            """,
                customer,
                as_dict=1,
            )
    
    dso = 0

    for i in data:
        
        obj_date = i["month"]
#		print("before: " + str(outstanding))
        outstanding = outstanding - i['total']
#		print("after:" + str(outstanding))
        
        if outstanding <= 0:
            return round((datetime.now().date()-obj_date).days,0)
            # 	dso = (datetime.now() - obj_date).days
            
            # else:
                
            # 	dso = dso + (1 if outstanding > i['total'] else outstanding/i['total']) * monthrange(i["year"], i["month"])[1]
            # 	outstanding = outstanding - i['total']
    
    return 9999

@frappe.whitelist()
def get_data_for_dashboard():
    pass

# aj - call from - remainders.remainders.public.js.dispatch_order(js).dispatch(function)
@frappe.whitelist()
def send_to_trello(link='',name='',customer='',date='',po_no='',contact_person='',transport_payment='',delivery_type='',customer_vehicle='',special_instructions=''):
    
    url = "https://n8n.dhupargroup.com/webhook/eb7323ad-6d9d-4773-b28d-e4167e183310"

    data = {
        "link": link,
        "name": name,
        "customer": customer,
        "date": date,
        "po_no": po_no,
        "customer_contact_person": contact_person,
        "transport_payment": transport_payment,
        "delivery_type": delivery_type,
        "customer_vehicle": customer_vehicle,
        "special_instructions": special_instructions
    }

    headers = {
        'content-type': "application/json",
        'cache-control': "no-cache"
        }

    response = requests.post(url, data=json.dumps(data), headers=headers)

# call from n8n http request (name: customer sync to kylas)
@frappe.whitelist()
def retrive_customer_data():
    cust_data = frappe.db.sql("""
                                SELECT name,tax_id FROM `tabCustomer`
                            """,as_dict=1)
    # d = json.dumps(cust_data)
    return cust_data
 
# (client_script - sales_invoice) call this function (event --> onload) --> script_line_no - 1-12
@frappe.whitelist()
def check_tcs(party_type, party='', loyalty_program=None):
    try:
        if party != '':
            cust = frappe.get_doc('Customer',party)
            return cust.tcs_disable
    except:
        pass


# Dashbord Function
@frappe.whitelist()
def get_sales_order_value():
    print(utils.today())
    sales_ord_grand_total = frappe.db.sql(f"""
                            SELECT transaction_date,sum(grand_total) as grand_total FROM `tabSales Order`
                            WHERE
                              status != 'To Deliver'
                              AND 	
                            status != 'Completed' 
                              AND status != 'Cancelled' 
                              AND status != 'Closed'
                            AND `transaction_date` = current_date()
                        """,as_dict=1)
    return sales_ord_grand_total

@frappe.whitelist()



def get_sales_inv_value():
    sales_inv_bill = frappe.db.sql(f"""
                                    SELECT posting_date,sum(grand_total) as grand_total FROM `tabSales Invoice`
                                    WHERE
                                    status = 'Paid'
                                    AND `posting_date` = current_date()
                                    """,as_dict=1)
    return sales_inv_bill


# Hook - Sales Order Submission Whats app notification
@frappe.whitelist()
def send_whatsapp_notification(doc,event):
    # customer = doc.customer
    # so_name = doc.name
    # amount = doc.grand_total
    # po_no = doc.po_no

    mobile = doc.customer_contact_person
    # mobile = "Ajay Patole 7972310527"
    if mobile != '':
        mobile_number = re.findall(r'[\+]?[1-9][0-9 .\-\(\)]{8,}[0-9]', mobile)

        for i in mobile_number:
            i = i.replace("+91","").replace(" ","")
            url = "https://api.interakt.ai/v1/public/message/"

            data1 = {
                    "countryCode": "+91",
                    "phoneNumber": f"{i}",
                    "callbackData": "some text here",
                    "type": "Template",
                    "template": {
                    "name": "sales_order_creation_dv",
                    "languageCode": "en",
                    "headerValues": [
                        f"https://erp.dhupargroup.com/api/method/frappe.utils.print_format.download_pdf?doctype=Sales%20Order&name={doc.name}&format=sales%20order&no_letterhead=1&letterhead=No%20Letterhead&settings=%7B%7D&_lang=en"
                    ],
                    "fileName": f"{doc.name}.pdf",
                    "bodyValues": [
                        f"{doc.customer.strip()}",
                        f"{doc.name.strip()}",
                        f"{doc.grand_total}",
                        f"{doc.po_no.strip()}"
                    ]
                }
            }

            payload = json.dumps(data1)
            print(payload,"\n")

            headers = {
                'Authorization': 'Basic LWVtZFRRUjVTY1NCbjFEMGdUckRJaVk1WTNoaGtxanNTMzdfd1dJSTF4TTo=',
                'Content-Type': 'application/json'
            }

            response = requests.request("POST", url, headers=headers, data=payload)

            # print(response.status_code,"\n",response.text,"\n")

            # logging.info(doc.customer)
            # logging.info(doc.name)
            # logging.info(i)
            # logging.info(response.text)

# Hook - Sales Invoice Whatsapp Notification
@frappe.whitelist()
def whatsapp_notification_sales_invoice(doc,event):
    customer = doc.customer
    inv_name = doc.name
    po_no = doc.po_no
    grand_total = doc.grand_total

    try:
        mobile = doc.customer_contact_person
        # mobile = "Ajay Patole 7972310527"
        mobile_number = re.findall(r'[\+\(]?[1-9][0-9 .\-\(\)]{8,}[0-9]', mobile)

        for i in mobile_number:
            i = i.replace("+91","").replace(" ","")
            url = "https://api.interakt.ai/v1/public/message/"

            data1 = {
                    "countryCode": "+91",
                    "phoneNumber": f"{i}",
                    "callbackData": "some text here",
                    "type": "Template",
                    "template": {
                    "name": "sales_invoice_creation",
                    "languageCode": "en",
                    "headerValues": [
                        f"https://erp.dhupargroup.com/api/method/frappe.utils.print_format.download_pdf?doctype=Sales%20Invoice&name={inv_name}&format=GST%20Tax%20Invoice%201&no_letterhead=0&letterhead=Default&settings=%7B%7D&_lang=en"
                    ],
                    "fileName": f"{inv_name}.pdf",
                    "bodyValues": [
                        f"{customer}",
                        f"{inv_name}",
                        f"{grand_total}",
                        f"{po_no}"
                    ]
                }
            }

            payload = json.dumps(data1)
            print(payload,"\n")

            headers = {
                'Authorization': 'Basic LWVtZFRRUjVTY1NCbjFEMGdUckRJaVk1WTNoaGtxanNTMzdfd1dJSTF4TTo=',
                'Content-Type': 'application/json'
            }

            response = requests.request("POST", url, headers=headers, data=payload)
            print(response.text)	

            # logging.info(customer)
            # logging.info(inv_name)
            # logging.info(i)
            # logging.info(response.text)
    except TypeError:
        frappe.throw("Please fill valid Customer contact person field or should not be blank (Address and Contact)")


# This code not having trigger point alternate code written in sales invoice client script(Name: recalculate due date)
# This fuction recalculate the Due Date When Sales Invoice is Submitted Or Updated
# Call --> Client Script(Sales Invoice)  # 08.09.2023
@frappe.whitelist()
def recalculate_due_date(doc,event):
    try:
        payment_term = frappe.get_value("Payment Term",doc.payment_terms_template,'credit_days')

        payment_schedule = doc.get('payment_schedule')

        for i in payment_schedule:
            if i.name:
                due_date = add_days(doc.posting_date, payment_term)
                frappe.db.set_value("Sales Invoice", doc.name,"due_date",due_date)
                frappe.db.set_value("Payment Schedule",i.name,"due_date",due_date)
                frappe.db.commit()
    except Exception as e:
        pass


@frappe.whitelist()
def moving_average(item_code):
    #-------------------------- 8.07.2023 ---------------------------------------
    purchase_data = frappe.db.sql(f"""
                                    SELECT pi.posting_date, sum(pii.qty) as qty, sum(pii.rate) as rate, sum(pii.amount) as amount FROM `tabPurchase Invoice Item` pii
                                    JOIN `tabPurchase Invoice` pi
                                    ON pii.parent = pi.name
                                    WHERE pii.docstatus = 1
                                    AND pii.item_code = '{item_code}'
                                    GROUP BY MONTH(pi.posting_date), YEAR(pi.posting_date)
                                    ORDER BY YEAR(pi.posting_date),MONTH(pi.posting_date)
                                """,as_dict=1)

    # purchase_reciept_data = frappe.db.sql(f"""
    # 								SELECT pr.posting_date, sum(pri.qty) as qty, sum(pri.rate) as rate, sum(pri.amount) as amount FROM `tabPurchase Receipt Item` pri 
    # 			       				JOIN `tabPurchase Receipt` pr
    # 			       				ON pri.parent = pr.name
    # 			       				WHERE pri.item_code = '{item_code}'
    # 							    GROUP BY MONTH(pr.posting_date), YEAR(pr.posting_date)
    # 								ORDER BY YEAR(pr.posting_date),MONTH(pr.posting_date)
    # 							""",as_dict=1)


    # purchase_data = purchase_data+purchase_reciept_data

    # return purchase_data,len(purchase_data)

    sell_data = frappe.db.sql(f"""
                        SELECT si.posting_date, sum(sii.qty) as qty FROM `tabSales Invoice Item` sii
                        JOIN `tabSales Invoice` si
                        ON sii.parent = si.name
                        WHERE sii.docstatus = 1
                        AND sii.item_code = '{item_code}'
                        GROUP BY MONTH(si.posting_date), YEAR(si.posting_date)
                        ORDER BY YEAR(si.posting_date),MONTH(si.posting_date)
                        """,as_dict=1)
    # return purchase_data,sell_data

    try:
        # adding openinng stock qty in data
        opening = frappe.db.sql(f"""
                                        SELECT posting_date, qty_after_transaction as qty, valuation_rate, stock_value as amount
                                        from `tabStock Ledger Entry` where item_code = '{item_code}'
                                        ORDER by creation asc
                                """,as_dict=1)[0]
        if opening.posting_date != purchase_data[0]['posting_date']:
            purchase_data.insert(0, opening)
    except:
        pass

    purchase = []
    if len(purchase_data):
        avg = 0
        qty = 0
        # print(purchase_data)
        for i in purchase_data:
            if i.qty != 0:
                amt = 0
                avg1 = float(i.amount)/float(i.qty)
                avg += avg1
                amt +=i.amount
                # qty = qty+i.qty
                purchase.append({"date":i.posting_date,'qty': i.qty,"amount":amt,"avg":avg1})
        # MA = avg/len(purchase)
        # return month,MA,sale_data

    sell = []
    if len(sell_data):
        for j in sell_data:
            sell.append({"date":j.posting_date,'qty': j.qty})
        # MA = avg/len(sell)
    # return purchase,sell


    if len(purchase) != 0 and len(sell) != 0:
        join_purchase_sell = purchase + sell
        # return purchase, sell

        sorted_purchase_sale = sorted(join_purchase_sell, key=lambda i: i['date'])


        # Swapping of row
        for i in range(2, len(sorted_purchase_sale)):
            try:
                if sorted_purchase_sale[i]['avg'] and sorted_purchase_sale[i]['date'].month == sorted_purchase_sale[i-1]['date'].month:
                    # print(data[i],data[i-1])
                    temp = sorted_purchase_sale[i]
                    sorted_purchase_sale[i] = sorted_purchase_sale[i-1]
                    sorted_purchase_sale[i-1] = temp
            except:
                pass

        # return sorted_purchase_sale
        #-----------------------------------------combine sell purchase------------------------------------------------
        actual_moving_avg = 0
        actual_qty = 0
        purchase = 0
        for row in range(len(sorted_purchase_sale)):
            print("month: ",sorted_purchase_sale[row]['date'].month,"/",sorted_purchase_sale[row]['date'].year,end='\t')
            try:
                try:
                    if sorted_purchase_sale[row]['avg']:
                        if row >= 1:
                            actual_moving_avg = ((actual_qty * actual_moving_avg) + (sorted_purchase_sale[row]['avg'] * sorted_purchase_sale[row]['qty']))/(actual_qty+sorted_purchase_sale[row]['qty'])
                            if actual_qty <= 0:
                                actual_qty = sorted_purchase_sale[row]['qty']
                            else:
                                actual_qty += sorted_purchase_sale[row]['qty']
                                purchase = sorted_purchase_sale[row]['qty']
                        else:
                            actual_moving_avg = sorted_purchase_sale[row]['avg'] # initialisation of moving_avg with opening or 1st purchase
                            actual_qty = sorted_purchase_sale[row]['qty'] # initialising actual_qty with opening or 1st purchase
                        print("Purchae:",sorted_purchase_sale[row]['qty'], "\tPrice:",sorted_purchase_sale[row]['avg'],"\tMA:",actual_moving_avg,end='\t')
                except:
                    if actual_qty <= 0:
                        actual_qty = 0
                    else:
                        print("qty:",actual_qty,end='\t')
                        actual_qty = actual_qty - sorted_purchase_sale[row]['qty']
                        print("sell:",sorted_purchase_sale[row]['qty'],end='\t')
                        if actual_qty <= 0:
                            actual_qty = 0
                            print('remain:',actual_qty,end='\t')
                        else:
                            print('remain:',actual_qty,end='\t')
                    if actual_qty <= 0:
                        actual_moving_avg = 0
                    if actual_moving_avg <= 0:
                        actual_moving_avg = 0
                        print("MA: ",actual_moving_avg,end='\t')
            except IndexError as e:
                pass
            print("\n")
            if actual_qty <= 0:
                actual_qty

        return [actual_moving_avg,actual_qty]
    # ------------------------------------end combine sell purchase-------------------------------------------

def calculate_moving_avg1(item_code):
    data = query_report.run(report_name = "Stock Balance",filters= {"company":"Dhupar Brothers Trading Pvt. Ltd.","from_date":"01-04-2018" ,"to_date":datetime.today().strftime('%Y-%m-%d'),"item_code":item_code},ignore_prepared_report= True)
    try:
        if len(data['result']) != 0:
            rows = data['result'][:-1]
            balance_qty = []
            balance_value = []

            for i in range(len(rows)):
                if rows[i]['bal_qty'] > 0 and rows[i]['bal_val'] > 0:
                    balance_qty.append(rows[i]['bal_qty'])
                    balance_value.append(rows[i]['bal_val'])

                # If Balance Value is less than 0 the only consider bal_qty
                if rows[i]['bal_val'] < 0 and rows[i]['bal_qty'] > 0:
                    balance_qty.append(rows[i]['bal_qty'])
                    with open("MA_Testing.log", 'a') as f:
                        f.write(str(rows[i]['item_code'])+"\n ")

            # print(balance_value,balance_qty)
            moving_avg = round(sum(balance_value)/sum(balance_qty),2)

            frappe.db.set_value("Item",item_code,"moving_average",moving_avg)
            frappe.db.commit()
            return moving_avg,sum(balance_qty)
    except Exception as e:
        pass

# To set the base moving avg(Stock Balance) This function doing this task
@frappe.whitelist()
def get_moving_avg():
    try:
        item_code = frappe.db.sql(f"""
                    SELECT item_code from `tabItem`
                """,as_dict=1)
        print(len(item_code))

        # item_code = list(kwargs.values())

        with open("item_code.log", 'w') as f:
            f.write(str(item_code))
 
        cnt = 0
        temp = 1
        for i in item_code:
            items = frappe.db.sql(f"""
                        SELECT item_code,SUM(actual_qty) as erp_qty from `tabBin`
                        where item_code='{i.item_code}' AND actual_qty IS NOT NULL
                    """,as_dict=1)

            if items[0].erp_qty == 0:
                frappe.db.set_value("Item",i.item_code,"moving_average",0)
                frappe.db.commit()
                # continue

            if items[0].item_code != None:
                if items[0].erp_qty != 0 or items[0].erp_qty != None:
                    data = calculate_moving_avg1(i.item_code)

                    if data != None:
                        moving_avg = data[0]
                        moving_qty = data[1]
                        if moving_qty == items[0].erp_qty:
                            with open("Moving Avg.log", 'a') as f:
                                f.write("item_code: "+str(items[0].item_code))
                                f.write("\tQty: "+str(items[0].erp_qty))
                                f.write("\tMoving Qty: "+str(moving_qty))
                                f.write("\t\t\tMoving Avg: "+str(moving_avg))
                                f.write("\n")
                            cnt+=1
                else:
                    frappe.db.set_value("Item",i.item_code,"moving_average",0)
                    frappe.db.commit()
            else:
                frappe.db.set_value("Item",i.item_code,"moving_average",0)
                frappe.db.commit()
            print(temp,": ",i.item_code)
            temp+=1
    except Exception as e:
        print(e)


# Hook(commented) - When Submitting Purchase Invoice this function Update base(Stock Balance) Moving Avg Of Item (Purchase invoice)
@frappe.whitelist()
def get_moving_avg_when_grn(doc,event):
    try:
        item_code = [i.item_code for i in doc.items]

        for i in item_code:
            data = calculate_moving_avg1(i)

            if data != None:
                moving_avg = data[0]
                moving_qty = data[1]
                with open("GRN_Moving_Avg.log", 'a') as f:
                    f.write("Name: "+str(doc.name))
                    f.write("\titem_code: "+str(i))
                    f.write("\tQty: "+str(moving_qty))
                    f.write("\t\t\tMoving Avg: "+str(moving_avg))
                    f.write("\n")
    except Exception as e:
        print(e)

# Hook - This Function Is Called When Purchase Invoice is Submitted and calculate moving avg
@frappe.whitelist()
def calculate_moving_average12(items):
    items = json.loads(items)
    try:
        for i in items:
            with open("item_code.log", 'a') as f:
                f.write(str(i))
                f.write("\n")
            current_item_qty = frappe.db.sql(f"""
                                                SELECT item_code,sum(actual_qty) as qty FROM `tabBin`
                                                WHERE item_code = '{i['item_code']}'
                                                AND `tabBin`.warehouse not in(SELECT name 
                                                FROM `tabWarehouse` 
                                                WHERE name like "%Rejection%" 
                                                OR name like "%Faulty%" 
                                                OR name like "%Working%"
                                                OR name like "%Tata%")
                                            """,as_dict=True)

            if len(current_item_qty) != 0:
                current_rate = frappe.db.get_value("Item",i['item_code'],"moving_average")
                if current_rate == None:
                    current_rate = 0

                current_qty = current_item_qty[0].qty
                if current_qty == None:
                    current_qty = 0

                purchase_rate = i['rate']
                purchase_qty = i['qty']

                # print(i.item_code,"\t",current_rate,"\t",current_qty,"\t",purchase_rate,"\t",purchase_qty,"\t")

                if purchase_qty < 0: # This condition will applicable when Purchase invoice Return(e.g PR-0483)
                    if current_qty != None or current_qty != 0:
                        moving_avg = current_rate
                    else:
                        moving_avg = 0 # When Stock is not available then making MA to 0
                else:
                    if current_qty == None or current_qty == 0:
                        if current_rate == None or current_rate == 0:
                            moving_avg = purchase_rate
                        else:
                            moving_avg = purchase_rate
                    else:
                        # current_qty = current_qty - purchase_qty
                        moving_avg = round(((float(current_rate) * float(current_qty)) + (float(purchase_rate) * float(purchase_qty)))/(float(current_qty) + float(purchase_qty)),2)

                # print(i.item_code,"\t",current_rate,"\t",current_qty,"\t",purchase_rate,"\t",purchase_qty,"\t",moving_avg)

            frappe.db.set_value("Item",i['item_code'],"moving_average",moving_avg)
            frappe.db.commit()
            with open("GRN_Moving_Avg.log", 'a') as f:
                f.write("Name: "+str(i['parent']))
                f.write("\titem_code: "+str(i['item_code']))
                f.write("\tcurrent_rate: "+str(current_rate))
                f.write("\tcurrent_qty: "+str(current_qty))
                f.write("\tpurchase_rate: "+str(purchase_rate))
                f.write("\tpurchase_qty: "+str(purchase_qty))
                f.write("\tMoving Avg: "+str(moving_avg))
                f.write("\n")
    except Exception as e:
        with open("GRN_Moving_Avg.log", 'a') as f:
                f.write("Name: "+str(i['name']))
                f.write("\tError: "+str(e))
                f.write("\n")

# This code is to update gst_category in Address
@frappe.whitelist()
def update_gst_category():
    address_data = frappe.db.sql(f"""
                                    SELECT address_title from `tabAddress`
                                """,as_dict=1)
    # print(address_data,len(address_data))
    # with open("AddressList.log","w") as f:
    # 	f.write(str(address_data))
    # 	f.write("\n")

    cnt = 1
    for i in address_data:
        name = frappe.db.get_value("Customer",i['address_title'],"gst_category")
        print(cnt,": ",i['address_title']," : ",name)
        if name != None:
            # with open("AddressGST.log","a") as f:
            # 	f.write(str(cnt))
            # 	f.write("\t: ")
            # 	f.write(str(i['address_title']))
            # 	f.write("\t\t:")
            # 	f.write(str(name))
            # 	f.write("\n")

            frappe.db.set_value('Address',{'address_title':i['address_title']},'gst_category',name)
            frappe.db.commit()
        cnt += 1
    print(len(address_data))


# Hook - This Fuction Checks the IRN Cancelled Or Not when invoice need to cancel
@frappe.whitelist()
def is_irn_canceled(doc,event):
    if doc.irn:
        frappe.throw('Please Cancel the IRN First')

# --------------------------------------------------------------------------------------------------------
# This Fuction Update The Price List of Item When submit purchase invoice 
@frappe.whitelist()
def update_price_list(doc,event):
    for i in doc.items:
            is_item_exist = frappe.db.exists('Item Price',{'item_code': i.item_code})

            pi_item_discount = float(10)

            if is_item_exist != None:
                if i.discount_percentage > pi_item_discount:
                    price_list_item = frappe.get_doc('Item Price',{'item_code': i.item_code})

                    if price_list_item.price_list_rate != i.price_list_rate:
                        frappe.set_value('Item Price',{'item_code': i.item_code},'price_list_rate',i.price_list_rate)
                        frappe.set_value('Item Price',{'item_code': i.item_code},'valid_from',doc.bill_date)
                        frappe.db.commit()
            else:
                not_brand = ['Misc','Transport & Packing','Legrand','KEI','Omron','Philips']
                if i.brand != None:
                    if i.item_group != 'Legrand':
                        if i.brand not in not_brand:
                            if i.discount_percentage > pi_item_discount:
                                new_item_price_list = frappe.new_doc('Item Price')
                                new_item_price_list.item_code = i.item_code
                                new_item_price_list.item_name = i.item_name
                                new_item_price_list.brand = i.brand
                                new_item_price_list.item_description = i.description
                                new_item_price_list.buying = True
                                new_item_price_list.selling = True
                                new_item_price_list.price_list = 'Standard Selling'
                                new_item_price_list.price_list_rate = i.price_list_rate
                                new_item_price_list.valid_from = doc.bill_date
                                new_item_price_list.insert()
# --------------------------------------------------------------------------------------------------------
# This Function Create Batch with Empty status
@frappe.whitelist()
def update_batch(doc_name):
	doc = frappe.get_doc('Purchase Receipt',doc_name)

	for item in doc.items:
		if frappe.db.get_value("Item", item.item_code, 'has_batch_no'):

			bt_no = frappe.db.get_value("Purchase Receipt Item", item.name, 'batch_no')

			if bt_no == '' or bt_no == None:
				item_code = item.item_code
				item_name = item.item_name
				uom = item.stock_uom
				qty = item.qty
				manufacturing_date = getdate()

				batch_doc = frappe.new_doc('Batch')
				batch_doc.batch_id = 'KEI-DRUM-'
				batch_doc.item = item_code
				batch_doc.item_name = item_name
				batch_doc.batch_qty = 0
				batch_doc.stock_uom = uom
				batch_doc.manufacturing_date = manufacturing_date
				batch_doc.insert()

				fetch_batch = frappe.get_doc("Batch", batch_doc.name)
				# frappe.db.set_value('Purchase Receipt Item', item.name, 'batch_no', last_batch_no[0]['name'])

				frappe.db.set_value('Purchase Receipt Item', {"name":item.name}, 'batch_no', fetch_batch.name)
				frappe.db.commit()
	return True

@frappe.whitelist()
def enable_batch_on_submit(doc,event):
	for it in doc.items:
		batch_no = it.get('batch_no')
		if batch_no:
			frappe.db.set_value('Batch',batch_no,'batch_qty',it.qty)
			frappe.db.commit()

# --------------------------------------------------------------------------------------------------------

# Testing Fuction
@frappe.whitelist()
def calculate_monthly_sma(item_code, start_date, end_date):
    # Defile the date range
    start_date = datetime.strftime(start_date, '%Y-%m-%d')
    end_date = datetime.strftime(end_date, '%Y-%m-%d')

    #Query the database for purchse transactions
    purchase_transactions = frappe.db.sql(f"""
                                SELECT pi.posting_date as date, pii.qty as quantity, pii.rate as rate
                                FROM `tabPurchase Invoice Item` pii
                                JOIN `tabPurchase Invoice` pi
                                ON pi.name = pii.parent
                                WHERE pii.item_code = '{item_code}'
                                AND pi.posting_date BETWEEN '{start_date}' AND '{end_date}'
                                AND pi.docstatus = 1
                                """,as_dict = 1)

    sales_transactions = frappe.db.sql(f"""
                                SELECT si.posting_date as date, sii.qty as quantity, sii.rate as rate
                                FROM `tabSales Invoice Item` sii
                                JOIN `tabSales Invoice` si
                                ON si.name = sii.parent
                                WHERE sii.item_code = '{item_code}'
                                AND si.posting_date BETWEEN '{start_date}' AND '{end_date}'
                                AND si.docstatus = 1
                                """,as_dict = 1)

    # Calculate the total purchase and sale amounts
    total_purchase = sum([trans.quantity * trans.rate] for trans in purchase_transactions)
    total_sales = sum([trans.quantity * trans.rate] for trans in sales_transactions)

    # Calculate the total quantity
    total_purchase_qty = sum([trans.quantity for trans in purchase_transactions])
    total_sales_qty = sum([trans.quantity for trans in sales_transactions])

    # Calculate the average purchase and sale prices
    avg_purchase_qty = total_purchase / total_purchase_qty if total_purchase_qty else 0
    avg_sales_price = total_sales / total_sales_qty if total_sales_qty else 0

    # Calculate the SMA (mean of average purchase and sale prices)
    sma = (avg_purchase_price + avg_sales_price) / 2

    return sma


# ---------------------------------------------------------------------------------------------------
logging.basicConfig(filename="send_mail.log", level=logging.INFO, format= '%(asctime)s - %(message)s', datefmt='%d-%b-%y %H:%M:%S')


# Call From Sales order menu (inside any sales order > ... > Send Company Documents)
@frappe.whitelist()
def send_company_documents(**kwargs):
    logging.info(kwargs)
    file_doc = get_files_in_folder("Home/Company Documents")["files"]

    for i in file_doc:
        dl = i['file_name'].split('.')
        if i['file_name'].split('.')[0] == kwargs.get('doc_name'):

            # fl_path = frappe.get_site_path('public', 'files', f'{i.file_url}')
            
            path = f"/home/dbtpl/frappe-bench/sites/erp.dhupargroup.com/public/files/{i['file_name']}"

            message = ""

            attachments = [{
						'fname': f"{i['file_name']}",
						'fcontent': open(path,'rb').read()
					}]

            frappe.sendmail(
                        recipients = kwargs.get('email_id'),
                        subject = "Company Documents",
                        sender = "info@dhuparbrothers.com",
                        message = message,
                        attachments = attachments
                    )
            frappe.db.commit()

            return True
# ---------------------------------------------------------------------------------------------------

@frappe.whitelist()
def send_company_documents1(**kwargs):
    logging.info(kwargs)
    file_doc = get_files_in_folder("Home/Company Documents")["files"]

    document_name = dict({
        'gst_certificate':'DBTPL GST CERTIFICATE UPDATED.pdf',
        'dhupar_corporate':'DHUPAR CORPORATE.pdf',
        'gpay_scanner':'GOOGLE PAY SCANNER.jpeg',
        'kotak_bank_details':'KOTAK BANK DETAILS WITH CANCELLED CHEQUE.pdf',
        'pan_card':'PAN CARD.pdf',
        'aut_service_center_certificate':'PUN AUTHORISED SERVICE CENTER CERTIFICATE DBTPL_2023.pdf',
        'stokist_certificate':'PUN AUTHORISED STOKIEST CERTIFICATE DBTPL_2023.pdf',
        'udyam_certificate':'UDYAM REGISTRATION CERTIFICATE.pdf'
    })

    names1 = []

    for k,v in kwargs.items():
        if v == '1':
            names1.append(document_name[k])
    print(names1)

    attachments = []
    for i in names1:
        path = f"/home/dbtpl/frappe-bench/sites/erp.dhupargroup.com/public/files/{i}"

        attachments.append({'fname': f"{i}",'fcontent': open(path,'rb').read()})

    message = ""

    frappe.sendmail(
                        recipients = kwargs.get('email_id'),
                        subject = "Company Documents",
                        sender = "accounts@dhuparbrothers.com",
                        message = message,
                        attachments = attachments
                    )
    frappe.db.commit()

    # frappe.msgprint(__('Ledger Sended'), alert=True)

#----------------------------------------------------------------------------------------------------------

@frappe.whitelist()
def smartshop():
    # logging.info('from api')
    inv = frappe.db.sql(f"""
                            SELECT
                                unique(si.name),
                                si.customer,
                                si.shipping_address_name as shipping_address_name,
                                si.company_address as company_address
                            FROM
                                `tabSales Invoice` si
                            JOIN
                                `tabSales Invoice Item` sii ON si.name = sii.parent
                            JOIN
                                `tabItem` i on sii.item_code = i.item_code
                            WHERE
                                si.docstatus = 1
                                AND si.custom_smartshop_order_no is NULL
                                AND date(si.creation) = '{nowdate()}'
                                AND si.customer not in ('Cash Sale')
                                AND si.status not in ('Return', 'Cancelled')
                                AND i.custom_smartshop_item = 1
                                AND sii.item_group like "%%L&T%%"
                        """,as_dict=1)

    for i in range(len(inv)):
        inv[i]['company_pincode'] = frappe.db.get_value('Address', {'name':inv[i]['company_address']}, 'pincode')
        items = frappe.db.sql(f"""
                                SELECT
                                    sii.item_code as item_code, 
                                    sii.qty as qty
                                FROM
                                    `tabSales Invoice Item` sii
                                JOIN
                                    `tabItem` i ON i.item_code = sii.item_code
                                WHERE
                                    sii.parent = '{inv[i]['name']}'
                                    AND sii.item_group like "%%L&T%%"
                                    AND i.custom_smartshop_item = 1
                            """,as_dict=1)

        address = frappe.db.sql(f"""
                                SELECT  
                                    gstin,
                                    address_line1,address_line2,
                                    city,
                                    state,
                                    country,
                                    pincode,
                                    email_id,phone
                                FROM 
                                    `tabAddress`
                                WHERE 
                                    name = '{inv[i]['shipping_address_name']}'
                            """,as_dict=1)

        try:
            # if multiple email_id with delimeter(,;:-= etc)
            email1= re.split(',|;|:|-|=',address[0]['email_id'])
            address[0]["email_id"] = email1[0]
        except Exception as e:
            pass

        inv[i]['address'] = address
        inv[i]['items'] = items
    return inv

@frappe.whitelist()
def update_smartshop_order_id(**kwargs):
    logging.info(kwargs)
    
    frappe.db.sql(f"""
                UPDATE `tabSales Invoice`
                SET custom_smartshop_order_no = '{kwargs.get('order_no')}'
                WHERE name = '{kwargs.get('invno')}'
                """)
    frappe.db.commit()

# -------------------------------------------------------------------------------------------------