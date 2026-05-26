from .nodes import intent_router, finops_query, system_health, general_response
from .state import NOCState


def run_noc_graph(query: str) -> NOCState:
    state: NOCState = {'query': query}
    state = intent_router(state)

    if state['intent'] == 'finops':
        state = finops_query(state)
    elif state['intent'] == 'health':
        state = system_health(state)
    else:
        state = general_response(state)

    return state
