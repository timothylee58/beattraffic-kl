from .state import NOCState


def call_claude(system_prompt: str, user_prompt: str) -> str:
    # Placeholder foundation; wire anthropic client in phase 2.
    return f"[{system_prompt[:24]}...] {user_prompt}"


def intent_router(state: NOCState) -> NOCState:
    query = state.get('query', '').lower()
    if any(token in query for token in ['cost', 'spend', 'finops', 'budget']):
        state['intent'] = 'finops'
    elif any(token in query for token in ['health', 'uptime', 'latency', 'error']):
        state['intent'] = 'health'
    else:
        state['intent'] = 'general'
    return state


def finops_query(state: NOCState) -> NOCState:
    q = state.get('query', '')
    blocked = ['drop ', 'truncate ', 'alter ', 'create table', 'delete from']
    if any(token in q.lower() for token in blocked):
        state['answer'] = 'Blocked: DDL/DML mutation requests are not allowed in FinOps mode.'
        return state
    state['answer'] = call_claude('You are a FinOps analyst. Read-only response only.', q)
    return state


def system_health(state: NOCState) -> NOCState:
    state['answer'] = call_claude('You are an SRE health analyst. Prioritize incident clarity.', state.get('query', ''))
    return state


def general_response(state: NOCState) -> NOCState:
    state['answer'] = call_claude('You are an enterprise NOC assistant.', state.get('query', ''))
    return state
