# Copyright (c) 2023, Gurshish Dhupar and contributors
# For license information, please see license.txt

from collections import OrderedDict

import frappe
from frappe import _, qb, scrub
from frappe.query_builder import Criterion
from frappe.query_builder.functions import Date
from frappe.desk import query_report
from datetime import datetime
from frappe.utils import cint, cstr, flt, getdate, nowdate
import logging


def execute(filters=None):
	return get_columns(), get_data(filters)

def get_data(filters):
	print(f"\n\n\n{filters}\n\n\n")

	outstanding = query_report.run(report_name = "Accounts Receivable",filters= {"company":"Dhupar Brothers Trading Pvt. Ltd.","customer":filters.customer ,"report_date":datetime.today().strftime('%Y-%m-%d'),"ageing_based_on":"Posting Date","range1":30,"range2":60,"range3":90,"range4":120},ignore_prepared_report= True)
	outstanding = outstanding['result']

	final_data = []
	last_row = None
	for i in outstanding:
		if type(i) != list:
			if 'po_no' in i:
				po_date = frappe.db.sql(f"""
											SELECT name,po_date
											FROM `tabSales Invoice`
											WHERE name = '{i.voucher_no}'
									""",as_dict=1)[0]
				i['po_date'] = po_date.po_date

			final_data.append({
				"name": i.voucher_no,
				"posting_date":i.posting_date,
				"customer": i.customer_name,
				"po_no":i.po_no,
				"po_date":i.po_date,
				"due_date":i.due_date,
				"age":i.age,
				"base_rounded_total": i.invoice_grand_total,
				"paid_amount": i.paid,
				"cn_amount": i.credit_note,
				"outstanding_amount": i.outstanding
				})
		else:
			if i[11] > 0:
				last_row = i
			else:
				final_data = []

	return final_data

def get_columns():
	return [
		 {
            'fieldname': 'name',
            'label': _('Invoice No'),
            'fieldtype': 'Link',
			"options": 'Sales Invoice',
			'width' : '100'
        },
		{
            'fieldname': 'posting_date',
            'label': _('Invoice Date'),
            'fieldtype': 'Date',
			'width' : '105'
        },
		{
            'fieldname': 'customer',
            'label': _('Customer'),
            'fieldtype': 'Link',
			"options": "Customer",
			'width' : '100'	
        },
		{
            'fieldname': 'po_no',
            'label': _('PO Number'),
            'fieldtype': 'Data',
			'width' : '100'	
        },
		{
            'fieldname': 'po_date',
            'label': _('PO Date'),
            'fieldtype': 'Data',
			'width' : '100'
        },
		{
            'fieldname': 'due_date',
            'label': _('Due Date'),
            'fieldtype': 'Date',
			'width' : '100'
        },
		{
            'fieldname': 'age',
            'label': _('Age'),
            'fieldtype': 'Int',
			'width' : '100'
        },
		{
            'fieldname': 'base_rounded_total',
            'label': _('Invoice Amount'),
            'fieldtype': 'Currency',
			'width' : '150'
        },
		{
            'fieldname': 'paid_amount',
            'label': _('Paid Amount'),
            'fieldtype': 'Currency',
			'width' : '150'
        },
		{
            'fieldname': 'cn_amount',
            'label': _('Credit Note'),
            'fieldtype': 'Currency',
			'width' : '150'
        },
		{
            'fieldname': 'outstanding_amount',
            'label': _('Outstanding'),
            'fieldtype': 'Currency',
			'width' : '150'
        },
	]

