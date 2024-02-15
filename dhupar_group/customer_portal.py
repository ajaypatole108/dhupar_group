import frappe
import requests
import json

@frappe.whitelist()
def get_item_details():
    # Source and target API URLs
    source_url = "https://erp.dhupargroup.com/api/resource/Item"
    target_url = "http://customer.dhuparbrothers.com/api/resource/Item"
    api_key_source = "d2608901caf712d:7b73f22fadeadac"
    api_key_target = "0d7c521ec4432b0:74ce690d6d8e986"

    headers = {
        "Authorization": f"token {api_key_source}",
        "Content-Type": "application/json"
    }

    # params = {
    #         "fields": "item_code,item_name"  # Add or remove fields as needed
    # }

    # Fetch Customers from the source instance
    response = requests.get(source_url, headers=headers)
    print(response,type(response))
    print(response.text)

    # fields = frappe.db.get_all('Item',fields = ['item_code', 'item_name', 'description', 'gst_hsn_code', 'item_group', 'brand', 'stock_uom'], page_length=1)
    # print(fields)

    # if response.status_code == 200:
    customers_data = response.json()['data']
    # print(customers_data)

    # Push Customers to the target instance
    headers['Authorization'] = f"token {api_key_target}"

    if response.status_code == 200:
        for customer in response:
            # Adjust data if needed before sending to the target instance
            data_to_send = {
                "item_code": customer["item_code"],
                "item_name": customer["item_name"],
                "description": customer["description"],
                "gst_hsn_code": customer["gst_hsn_code"],
                "item_group": customer["item_group"],
                "brand": customer["brand"],
                "stock_uom": customer["stock_uom"]
                # Include other fields needed by the target instance
            }

            # POST request to create Customers in the target instance
            create_response = requests.post(target_url, json=data_to_send, headers=headers)
            if create_response.status_code == 200:
                print(f"Customer '{customer['name']}' synced successfully.")
            else:
                print(f"Failed to sync customer '{customer['name']}'. Error: {create_response.text}")
    else:
        print("Failed to fetch Customers from the source instance.")

@frappe.whitelist()
def sync_item(doc,event):

    source_url = "https://erp.dhupargroup.com/api/resource/Item"
    target_url = "http://customer.dhuparbrothers.com/api/resource/Item"
    api_key_source = "d2608901caf712d:7b73f22fadeadac"
    api_key_target = "0d7c521ec4432b0:265a9631ae22e14"

    headers = {
        # "Authorization": f"token {api_key_target}",
        "Content-Type": "application/json"
    }

    response = requests.get(source_url, headers=headers)

    # item_data = response.json()['data']
    # ll
    # Push Customers to the target instance
    headers['Authorization'] = f"token {api_key_target}"

    if True:
        # Adjust data if needed before sending to the target instance
        data_to_send1 = {
            "item_code": doc.item_code,
            "item_name": doc.item_name,
            "description": doc.description,
            "gst_hsn_code": doc.gst_hsn_code,
            "item_group": doc.item_group,
            "brand": doc.brand,
            "stock_uom": doc.stock_uom
            # Include other fields needed by the target instance
        }
        data_to_send = json.dumps(data_to_send1)

        # POST request to create Customers in the target instance
        create_response = requests.post(target_url, data=data_to_send, headers=headers)
        print(create_response)
        if create_response.status_code == 200:
            # print(f"Customer '{customer['name']}' synced successfully.")
            pass
        else:
            # print(f"Failed to sync customer '{customer['name']}'. Error: {create_response.text}")
            pass
    else:
        print("Failed to fetch Customers from the source instance.")