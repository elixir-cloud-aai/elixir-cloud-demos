import os
from config import FUNNEL_SERVER_USER, FUNNEL_SERVER_PASSWORD, TES_TOKEN

def get_instance_credentials(instance_name, instance_url):
    default_user = FUNNEL_SERVER_USER
    default_pass = FUNNEL_SERVER_PASSWORD
    default_token = TES_TOKEN
    
    if 'tesk-prod.cloud.e-infra.cz' in instance_url:
        return {
            'user': os.getenv('TESK_PROD_USER', default_user),
            'password': os.getenv('TESK_PROD_PASSWORD', default_pass),
            'token': os.getenv('TESK_PROD_TOKEN', default_token)
        }
    elif 'tesk-na.cloud.e-infra.cz' in instance_url:
        return {
            'user': os.getenv('TESK_NA_USER', default_user),
            'password': os.getenv('TESK_NA_PASSWORD', default_pass),
            'token': os.getenv('TESK_NA_TOKEN', default_token)
        }
    else:
        return {
            'user': default_user,
            'password': default_pass,
            'token': default_token
        }
